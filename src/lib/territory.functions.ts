import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAuthorization } from "@/lib/admin-authorization";
export const territorySchema = z.object({
  point_id: z.uuid(),
  district: z.string().trim().min(2).max(100),
  zone: z.enum(["Sul", "Norte", "Leste", "Oeste", "Centro"]),
  source: z.string().trim().min(5).max(500),
});
export const saveTerritory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => territorySchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: point, error: pointError } = await supabaseAdmin
      .from("collection_points")
      .select("city,state")
      .eq("id", data.point_id)
      .maybeSingle();
    if (pointError || !point || point.city !== "São Paulo" || point.state !== "SP")
      throw new Error("Classificação por zona disponível somente para a cidade de São Paulo.");
    const { error } = await supabaseAdmin
      .from("point_territory")
      .upsert({ ...data, confirmed_at: new Date().toISOString(), confirmed_by: context.userId });
    if (error)
      throw new Error("Não foi possível salvar. Confira a migração de classificação regional.");
    return { ok: true };
  });
export const territoryCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const zones = ["Sul", "Norte", "Leste", "Oeste", "Centro"];
    const counts = [];
    for (const zone of zones) {
      const { count, error } = await supabaseAdmin
        .from("collection_points")
        .select("id,point_territory!inner(zone)", { count: "exact", head: true })
        .eq("city", "São Paulo")
        .eq("state", "SP")
        .eq("is_active", true)
        .eq("curation_status", "verified")
        .eq("point_territory.zone", zone);
      if (error) throw new Error("Contagem regional indisponível. Confira a migração.");
      counts.push({ zone, count: count ?? 0 });
    }
    const { count, error } = await supabaseAdmin
      .from("collection_points")
      .select("id", { count: "exact", head: true })
      .eq("city", "São Paulo")
      .eq("state", "SP")
      .eq("is_active", true)
      .eq("curation_status", "verified");
    if (error) throw new Error("Não foi possível contar os cadastros.");
    return {
      counts,
      unclassified: (count ?? 0) - counts.reduce((sum, item) => sum + item.count, 0),
    };
  });

export const getTerritory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ point_id: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("point_territory")
      .select("district,zone,source,confirmed_at")
      .eq("point_id", data.point_id)
      .maybeSingle();
    if (error) throw new Error("Classificação regional indisponível. Confira a migração.");
    return row;
  });
