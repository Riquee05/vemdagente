import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const importSchema = z.object({
  city: z.string().trim().min(2).max(80),
  preset: z.enum(["all", "doacao", "apoio"]).optional(),
  queries: z.array(z.string().trim().min(2).max(80)).min(1).max(12).optional(),
  maxPerQuery: z.number().int().min(1).max(20).optional(),
});

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: { name: string }[];
  editorialSummary?: { text?: string };
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
};

/** Grupos de busca: cada consulta já sabe quais categorias o local costuma aceitar. */
const QUERY_GROUPS: { kind: "doacao" | "apoio"; queries: string[]; cats: string[] }[] = [
  {
    kind: "doacao",
    queries: ["ONG doação de roupas", "bazar solidário beneficente"],
    cats: ["roupas-adultas", "roupas-infantis"],
  },
  {
    kind: "doacao",
    queries: [
      "banco de alimentos",
      "ONG que distribui cestas básicas",
      "sopão para pessoas em situação de rua",
    ],
    cats: ["alimentos"],
  },
  {
    kind: "apoio",
    queries: [
      "casa de acolhimento",
      "albergue para pessoas em situação de rua",
      "centro de referência de assistência social CRAS",
      "Cáritas Arquidiocesana",
      "Exército de Salvação",
    ],
    cats: ["apoio", "alimentos", "roupas-adultas"],
  },
  {
    kind: "apoio",
    queries: [
      "instituição de caridade",
      "casa de apoio a crianças carentes",
      "abrigo de idosos filantrópico",
    ],
    cats: ["apoio", "doacao-financeira"],
  },
];

/** Palavras que indicam logística/comércio, não doação — descartadas na importação. */
const BLOCKED_TERMS = [
  "shopee",
  "correios",
  "mercado livre",
  "melhor envio",
  "jadlog",
  "loggi",
  "amazon",
  "sequoia",
  "total express",
  "reciclagem",
  "ferro velho",
  "sucata",
  "ecoponto",
  "entulho",
  "prefeitura",
  "santa retirada",
];

function isRelevant(name: string) {
  const lower = name.toLowerCase();
  return !BLOCKED_TERMS.some((term) => lower.includes(term));
}


/** Importa pontos reais do Google Maps (Places API New) — apenas administradores. */
export const importGooglePoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => importSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (profile?.role !== "admin") throw new Error("Forbidden");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["GOOGLE_MAPS_API_KEY"];
    const browserKey = process.env["GOOGLE_MAPS_BROWSER_KEY"];
    if (!lovableKey || !connectionKey) throw new Error("Conexão do Google Maps indisponível.");

    const preset = data.preset ?? "all";
    const maxPerQuery = data.maxPerQuery ?? 10;

    const groups = data.queries
      ? [{ kind: "doacao" as const, queries: data.queries, cats: [] as string[] }]
      : QUERY_GROUPS.filter((group) => preset === "all" || group.kind === preset);

    const found = new Map<string, { place: GooglePlace; cats: Set<string> }>();

    for (const group of groups) {
      for (const q of group.queries) {
        const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": connectionKey,
            "Content-Type": "application/json",
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours.weekdayDescriptions,places.photos,places.addressComponents,places.editorialSummary",
          },
          body: JSON.stringify({
            textQuery: `${q} em ${data.city}`,
            languageCode: "pt-BR",
            regionCode: "BR",
            maxResultCount: maxPerQuery,
          }),
        });

        if (response.status === 403) {
          const body = await response.text();
          throw new Error(`Google Maps negou a requisição (403): ${body}`);
        }
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Falha na busca do Google Maps [${response.status}]: ${body}`);
        }

        const payload = (await response.json()) as { places?: GooglePlace[] };
        for (const place of payload.places ?? []) {
          const placeName = place.displayName?.text ?? "";
          if (!place.id || !place.location || !isRelevant(placeName)) continue;
          const entry = found.get(place.id) ?? { place, cats: new Set<string>() };
          group.cats.forEach((slug) => entry.cats.add(slug));
          found.set(place.id, entry);
        }
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = [...found.keys()];
    const { data: existing } = await supabaseAdmin
      .from("collection_points")
      .select("google_place_id")
      .in("google_place_id", ids.length ? ids : ["none"]);
    const known = new Set((existing ?? []).map((row) => row.google_place_id));

    const pending = [...found.values()].filter((entry) => !known.has(entry.place.id));

    const rows = pending.map(({ place }) => {
      const components = place.addressComponents ?? [];
      const state =
        components.find((c) => (c.types ?? []).includes("administrative_area_level_1"))?.shortText ??
        null;
      const city =
        components.find((c) => (c.types ?? []).includes("administrative_area_level_2"))?.longText ??
        components.find((c) => (c.types ?? []).includes("locality"))?.longText ??
        data.city;
      const photoName = place.photos?.[0]?.name;
      return {
        name: place.displayName?.text ?? "Ponto de coleta",
        description: place.editorialSummary?.text ?? null,
        address: place.formattedAddress ?? null,
        city,
        state,
        lat: place.location!.latitude,
        lng: place.location!.longitude,
        phone: place.nationalPhoneNumber ?? null,
        website: place.websiteUri ?? null,
        opening_hours: place.regularOpeningHours?.weekdayDescriptions?.join(" · ") ?? null,
        photo_url:
          photoName && browserKey
            ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=900&key=${browserKey}`
            : null,
        google_place_id: place.id,
        source: "google_maps",
        curation_status: "verified",
        is_active: true,
      };
    });

    let created = 0;
    if (rows.length) {
      const { data: inserted, error } = await supabaseAdmin
        .from("collection_points")
        .insert(rows)
        .select("id, google_place_id");
      if (error) throw new Error(error.message);
      created = inserted?.length ?? 0;

      // Vincula as categorias que cada grupo de busca indica.
      const { data: categories } = await supabaseAdmin.from("item_categories").select("id, slug");
      const bySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));
      const links: { point_id: string; category_id: string }[] = [];
      for (const row of inserted ?? []) {
        const entry = found.get(row.google_place_id as string);
        for (const slug of entry?.cats ?? []) {
          const categoryId = bySlug.get(slug);
          if (categoryId) links.push({ point_id: row.id, category_id: categoryId });
        }
      }
      if (links.length) await supabaseAdmin.from("point_accepted_items").insert(links);
    }

    await supabaseAdmin.from("point_import_logs").insert({
      query_city: data.city,
      points_found: found.size,
      points_created: created,
      run_by: "admin",
    });

    return { found: found.size, created, skipped: found.size - rows.length };
  });
