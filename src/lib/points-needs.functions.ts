import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const needSchema = z.object({
  pointId: z.string().uuid(),
  categoryId: z.string().uuid(),
  urgency: z.enum(["low", "normal", "high", "critical"]),
  note: z.string().trim().max(500).nullable(),
});

const updateNeedSchema = z.object({
  needId: z.string().uuid(),
  urgency: z.enum(["low", "normal", "high", "critical"]).optional(),
  note: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

const removeNeedSchema = z.object({
  needId: z.string().uuid(),
});

async function audit(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: string,
  entityId: string,
  details: Record<string, unknown>,
) {
  await supabase.from("admin_audit_log").insert({
    actor_id: userId,
    action,
    entity: "point_needs",
    entity_id: entityId,
    details: details as Json,
  });
}

/** Adiciona uma necessidade a um ponto (admin ou responsável do ponto). */
export const addPointNeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => needSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("point_needs")
      .insert({
        point_id: data.pointId,
        category_id: data.categoryId,
        urgency: data.urgency,
        note: data.note,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await audit(context.supabase, context.userId, "add", inserted.id, {
      point_id: data.pointId,
      category_id: data.categoryId,
      urgency: data.urgency,
      note: data.note,
    });

    return { id: inserted.id };
  });

/** Atualiza uma necessidade existente. */
export const updatePointNeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateNeedSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Database["public"]["Tables"]["point_needs"]["Update"] = {};
    if (data.urgency !== undefined) patch["urgency"] = data.urgency;
    if (data.note !== undefined) patch["note"] = data.note;
    if (data.isActive !== undefined) patch["is_active"] = data.isActive;

    const { error } = await context.supabase
      .from("point_needs")
      .update(patch)
      .eq("id", data.needId);
    if (error) throw new Error(error.message);

    const auditDetails: Record<string, unknown> = {};
    if (data.urgency !== undefined) auditDetails["urgency"] = data.urgency;
    if (data.note !== undefined) auditDetails["note"] = data.note;
    if (data.isActive !== undefined) auditDetails["is_active"] = data.isActive;

    await audit(context.supabase, context.userId, "update", data.needId, auditDetails);

    return { ok: true };
  });

/** Remove uma necessidade permanentemente. */
export const deletePointNeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeNeedSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("point_needs").delete().eq("id", data.needId);
    if (error) throw new Error(error.message);

    await audit(context.supabase, context.userId, "delete", data.needId, {});

    return { ok: true };
  });

/** Lista necessidades de um ponto (para admin). */
export const listPointNeeds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ pointId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("point_needs")
      .select(
        "id, point_id, category_id, urgency, note, is_active, item_categories ( id, slug, label, kind )",
      )
      .eq("point_id", data.pointId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
