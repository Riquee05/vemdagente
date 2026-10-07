import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAuthorization } from "@/lib/admin-authorization";
import { duplicateGroups, type DuplicatePoint } from "@/lib/donation-planning";
export const getDuplicateAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const points: DuplicatePoint[] = [];
    for (let offset = 0; offset < 10000; offset += 500) {
      const { data, error } = await context.supabase
        .from("collection_points")
        .select("id,name,phone,address,city,description")
        .eq("state", "SP")
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new Error("Não foi possível conferir duplicidades.");
      points.push(...(data || []));
      if ((data || []).length < 500) return { groups: duplicateGroups(points), limited: false };
    }
    return { groups: duplicateGroups(points), limited: true };
  });
export const getPointHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ point_id: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("point_change_history")
      .select("id,actor_id,changed_at,changes")
      .eq("point_id", data.point_id)
      .order("changed_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Confira se a migração de histórico foi aplicada.");
    const ids = [...new Set((rows || []).flatMap((row) => (row.actor_id ? [row.actor_id] : [])))];
    const { data: profiles, error: profileError } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,full_name").in("id", ids)
      : { data: [], error: null };
    if (profileError) throw new Error("Não foi possível identificar os responsáveis.");
    return (rows || []).map((row) => ({
      ...row,
      actor:
        profiles?.find((profile) => profile.id === row.actor_id)?.full_name ||
        (row.actor_id ? "Conta sem nome" : "Sistema / responsável não registrado"),
    }));
  });
