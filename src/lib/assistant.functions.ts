import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

const askSchema = z.object({
  message: z.string().trim().min(2).max(600),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(10)
    .optional(),
});

export type AssistantPoint = {
  id: string;
  name: string;
  address: string | null;
  city: string;
  state: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  photo_url: string | null;
  opening_hours: string | null;
  donation_method: string | null;
  description: string | null;
  distance_km: number | null;
};

export type AssistantAnswer = {
  reply: string;
  points: AssistantPoint[];
  location: { label: string; lat: number; lng: number } | null;
  categoryLabel: string | null;
};

/** Lê o texto final de uma chamada streaming da Responses API. */
async function streamResponsesText(body: Record<string, unknown>): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("O assistente não está configurado (chave de IA ausente).");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ ...body, model: MODEL, stream: true }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Muitas perguntas ao mesmo tempo. Tente de novo em alguns segundos.");
    if (res.status === 402 || res.status === 403)
      throw new Error("O assistente está temporariamente indisponível (limite de uso da IA).");
    throw new Error(`Falha ao consultar o assistente (${res.status}). ${detail.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as { type?: string; delta?: string };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            text += event.delta;
          }
        } catch {
          // ignora eventos parciais
        }
      }
    }
  }

  return text.trim();
}

type Intent = {
  intencao: "doar" | "receber" | "outro";
  categoria_slug: string | null;
  local: string | null;
  raio_km: number;
};

/** Extrai a intenção da pergunta (categoria + cidade) em JSON estrito. */
async function extractIntent(
  message: string,
  categories: { slug: string; label: string; kind: string }[],
): Promise<Intent> {
  const raw = await streamResponsesText({
    instructions:
      "Você interpreta perguntas em português do Brasil sobre doações e redes de apoio. " +
      "Escolha a categoria mais próxima da lista, ou null quando não houver. " +
      "Extraia o local citado (cidade, bairro ou endereço) exatamente como aparece, ou null.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `Categorias disponíveis (slug — rótulo):\n` +
              categories.map((c) => `${c.slug} — ${c.label}`).join("\n") +
              `\n\nPergunta: ${message}`,
          },
        ],
      },
    ],
    reasoning: { effort: "low", summary: "auto" },
    text: {
      format: {
        type: "json_schema",
        name: "intencao_doacao",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            intencao: { type: "string", enum: ["doar", "receber", "outro"] },
            categoria_slug: { type: ["string", "null"] },
            local: { type: ["string", "null"] },
            raio_km: { type: "number" },
          },
          required: ["intencao", "categoria_slug", "local", "raio_km"],
        },
      },
    },
  });

  try {
    const parsed = JSON.parse(raw) as Intent;
    return {
      intencao: parsed.intencao ?? "outro",
      categoria_slug: parsed.categoria_slug ?? null,
      local: parsed.local ?? null,
      raio_km: Math.min(Math.max(Number(parsed.raio_km) || 20, 3), 60),
    };
  } catch {
    return { intencao: "outro", categoria_slug: null, local: null, raio_km: 20 };
  }
}

async function geocode(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "DoaAqui/1.0 (assistente)" },
  });
  if (!res.ok) return null;
  const list = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  const first = list[0];
  if (!first) return null;
  return { label: first.display_name, lat: Number(first.lat), lng: Number(first.lon) };
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => askSchema.parse(data))
  .handler(async ({ data }): Promise<AssistantAnswer> => {
    const supabase = createClient(
      process.env["VITE_SUPABASE_URL"]!,
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false } },
    );

    const { data: categories } = await supabase
      .from("item_categories")
      .select("id, slug, label, kind")
      .order("label");
    const cats = categories ?? [];

    const intent = await extractIntent(data.message, cats);

    let location: { label: string; lat: number; lng: number } | null = null;
    if (intent.local) location = await geocode(intent.local);
    if (!location && typeof data.lat === "number" && typeof data.lng === "number") {
      location = { label: "sua localização atual", lat: data.lat, lng: data.lng };
    }

    const category = intent.categoria_slug
      ? cats.find((c) => c.slug === intent.categoria_slug) ?? null
      : null;

    let points: AssistantPoint[] = [];
    if (location) {
      const { data: nearby } = await supabase.rpc("search_nearby_points", {
        p_lat: location.lat,
        p_lng: location.lng,
        p_radius_km: intent.raio_km,
        p_limit: 8,
        ...(category ? { p_category_id: category.id } : {}),
      });
      points = (nearby ?? []) as AssistantPoint[];

      if (points.length === 0 && category) {
        const { data: fallback } = await supabase.rpc("search_nearby_points", {
          p_lat: location.lat,
          p_lng: location.lng,
          p_radius_km: Math.min(intent.raio_km * 2, 60),
          p_limit: 8,
        });
        points = (fallback ?? []) as AssistantPoint[];
      }
    }

    const contexto = points.length
      ? points
          .map(
            (p, i) =>
              `${i + 1}. ${p.name} — ${p.address ?? p.city}${
                p.distance_km != null ? ` (${p.distance_km.toFixed(1)} km)` : ""
              }${p.phone ? ` — tel ${p.phone}` : ""}${p.opening_hours ? ` — ${p.opening_hours}` : ""}`,
          )
          .join("\n")
      : "Nenhum ponto verificado encontrado para esse filtro.";

    const history = (data.history ?? [])
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Pessoa" : "Assistente"}: ${m.content}`)
      .join("\n");

    const reply = await streamResponsesText({
      instructions:
        "Você é o assistente do DoaAqui, uma plataforma brasileira que conecta quem quer doar a pontos de coleta, ONGs e redes de apoio reais. " +
        "Fale português do Brasil, com tom acolhedor, direto e curto (máximo 120 palavras). " +
        "Use SOMENTE os pontos listados no contexto; nunca invente locais, telefones ou endereços. " +
        "Cite no máximo 3 pontos pelo nome, dizendo a distância quando houver. " +
        "Se não houver pontos, explique com gentileza e sugira informar a cidade ou usar a busca em /pontos. " +
        "Nunca peça nem oriente pedir dinheiro para pessoas físicas: doação em dinheiro é só para instituições. " +
        "Não use markdown com títulos; escreva em frases simples.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                (history ? `Conversa anterior:\n${history}\n\n` : "") +
                `Pergunta: ${data.message}\n` +
                `Local considerado: ${location?.label ?? "não informado"}\n` +
                `Categoria: ${category?.label ?? "não definida"}\n` +
                `Raio: ${intent.raio_km} km\n\nPontos verificados encontrados:\n${contexto}`,
            },
          ],
        },
      ],
      reasoning: { effort: "low", summary: "auto" },
    });

    return {
      reply:
        reply ||
        "Não consegui montar uma resposta agora. Tente reformular a pergunta informando a cidade e o que quer doar.",
      points,
      location,
      categoryLabel: category?.label ?? null,
    };
  });
