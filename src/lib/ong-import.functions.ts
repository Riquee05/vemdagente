import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAuthorization } from "@/lib/admin-authorization";
import {
  ongCandidates,
  ONG_SOURCE_DATE,
  ONG_SOURCE_URL,
  validateOngLocation,
  type GeocodedAddress,
} from "@/lib/ong-candidates";

export const importOngCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ cnpj: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const candidate = ongCandidates.find((item) => item.cnpj === data.cnpj);
    if (!candidate) throw new Error("Instituição não encontrada neste lote.");
    const digest = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`pro-social:${candidate.cnpj}`),
      ),
    );
    digest[6] = (digest[6]! & 15) | 80;
    digest[8] = (digest[8]! & 63) | 128;
    const hex = Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("collection_points")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw new Error("Não foi possível verificar o cadastro existente.");
    if (existing) return { status: "existing" as const, id: existing.id };
    const { data: sameName, error: nameError } = await supabaseAdmin
      .from("collection_points")
      .select("id")
      .ilike("name", candidate.name.replace(/[%_\\]/g, "\\$&"))
      .limit(1);
    if (nameError) throw new Error("Não foi possível verificar duplicatas.");
    if (sameName?.length) return { status: "existing" as const, id: sameName[0]!.id };
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !connectionKey)
      throw new Error("Conecte o Google Maps no Lovable para localizar os endereços.");
    const url = new URL("https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json");
    url.searchParams.set(
      "address",
      `${candidate.address}, ${candidate.postalCode}, São Paulo, SP, Brasil`,
    );
    url.searchParams.set("components", "country:BR|administrative_area:SP");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("Não foi possível localizar o endereço. Tente novamente.");
    const payload = (await response.json()) as { status: string; results?: GeocodedAddress[] };
    if (payload.status !== "OK")
      throw new Error("Google Maps não localizou o endereço. Revise o cadastro.");
    const location = validateOngLocation(
      payload.results?.[0],
      candidate.postalCode,
      candidate.address.split(", ")[1]?.split(" —")[0] ?? "",
    );
    const { data: inserted, error } = await supabaseAdmin
      .from("collection_points")
      .upsert(
        {
          id,
          name: candidate.name,
          address: `${candidate.address} — CEP ${candidate.postalCode}`,
          city: candidate.city,
          state: candidate.state,
          phone: candidate.phone || null,
          lat: location.lat,
          lng: location.lng,
          source: "manual",
          curation_status: "pending",
          confirmation_status: "unconfirmed",
          is_active: true,
          description: `Cadastro Pró-Social. CNPJ: ${candidate.cnpj}. Fonte: ${ONG_SOURCE_URL}. Dados de ${ONG_SOURCE_DATE}. Contato e recebimento de doações precisam ser confirmados.`,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw new Error("Não foi possível salvar a instituição.");
    return { status: inserted?.length ? ("created" as const) : ("existing" as const), id };
  });
