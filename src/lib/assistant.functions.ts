import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const MODEL = "gemini-3.1-flash-lite";
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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

type GeminiSchema = Record<string, unknown>;

const FALLBACK_MODELS = [MODEL, "gemini-2.5-flash-lite", "gemini-2.5-flash"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chama o Gemini e devolve o texto final, com retentativas e modelos de reserva. */
async function geminiText(args: {
  instructions: string;
  prompt: string;
  jsonSchema?: GeminiSchema;
}): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("O assistente não está configurado (chave de IA ausente).");

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: args.instructions }] },
    contents: [{ role: "user", parts: [{ text: args.prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 800,
      thinkingConfig: { thinkingLevel: "low" },
      ...(args.jsonSchema
        ? { responseMimeType: "application/json", responseSchema: args.jsonSchema }
        : {}),
    },
  });

  let lastStatus = 0;
  let lastDetail = "";

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const model = FALLBACK_MODELS[i]!;
    // até 2 tentativas por modelo para falhas transitórias (429/5xx)
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
      });

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const parts = json.candidates?.[0]?.content?.parts ?? [];
        return parts
          .map((p) => p.text ?? "")
          .join("")
          .trim();
      }

      lastStatus = res.status;
      lastDetail = await res.text().catch(() => "");

      if (res.status === 401 || res.status === 403)
        throw new Error("O assistente está temporariamente indisponível (chave do Gemini inválida ou sem permissão).");

      const transient = res.status === 429 || res.status >= 500;
      if (!transient) break; // erro de requisição: tenta próximo modelo sem esperar
      if (attempt === 0) await sleep(700 + Math.floor(Math.random() * 500));
    }
  }

  if (lastStatus === 429)
    throw new Error("Muitas perguntas ao mesmo tempo. Tente de novo em alguns segundos.");
  if (lastStatus >= 500)
    throw new Error("O assistente está com muita procura agora. Tente de novo em alguns instantes.");
  throw new Error(`Falha ao consultar o assistente (${lastStatus}). ${lastDetail.slice(0, 200)}`);
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
  const raw = await geminiText({
    instructions:
      "Você interpreta perguntas em português do Brasil sobre doações e redes de apoio. " +
      "Escolha a categoria mais próxima da lista, ou null quando não houver. " +
      "Extraia o local citado (cidade, bairro ou endereço) exatamente como aparece, ou null. " +
      "Responda apenas com o JSON pedido.",
    prompt:
      `Categorias disponíveis (slug — rótulo):\n` +
      categories.map((c) => `${c.slug} — ${c.label}`).join("\n") +
      `\n\nPergunta: ${message}`,
    jsonSchema: {
      type: "object",
      properties: {
        intencao: { type: "string", enum: ["doar", "receber", "outro"] },
        categoria_slug: { type: "string", nullable: true },
        local: { type: "string", nullable: true },
        raio_km: { type: "number" },
      },
      required: ["intencao", "raio_km"],
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
    headers: { Accept: "application/json", "User-Agent": "Vem da Gente/1.0 (assistente)" },
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
    const supabaseUrl = process.env["SUPABASE_URL"];
    const supabasePublishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error("O assistente está temporariamente indisponível. Tente novamente em instantes.");
    }

    const supabase = createClient(
      supabaseUrl,
      supabasePublishableKey,
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

    const reply = await geminiText({
      instructions:
        "Você é o assistente do Vem da Gente, uma plataforma brasileira que conecta quem quer doar a pontos de coleta, ONGs e redes de apoio reais. " +
        "Fale português do Brasil, com tom acolhedor, direto e curto (máximo 120 palavras). " +
        "Use SOMENTE os pontos listados no contexto; nunca invente locais, telefones ou endereços. " +
        "Cite no máximo 3 pontos pelo nome, dizendo a distância quando houver. " +
        "Se não houver pontos, explique com gentileza e sugira informar a cidade ou usar a busca em /pontos. " +
        "Nunca peça nem oriente pedir dinheiro para pessoas físicas: doação em dinheiro é só para instituições. " +
        "Não use markdown com títulos; escreva em frases simples.",
      prompt:
        (history ? `Conversa anterior:\n${history}\n\n` : "") +
        `Pergunta: ${data.message}\n` +
        `Local considerado: ${location?.label ?? "não informado"}\n` +
        `Categoria: ${category?.label ?? "não definida"}\n` +
        `Raio: ${intent.raio_km} km\n\nPontos verificados encontrados:\n${contexto}`,
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
