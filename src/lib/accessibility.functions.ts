import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAuthorization } from "@/lib/admin-authorization";
import { accessibilitySchema } from "@/lib/accessibility";
const pointInput = (input: unknown) => z.object({ point_id: z.string().uuid() }).parse(input);
export const getPublicAccessibility = createServerFn({ method: "GET" })
  .inputValidator(pointInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: point, error: pointError } = await supabaseAdmin
      .from("collection_points")
      .select("id")
      .eq("id", data.point_id)
      .eq("state", "SP")
      .eq("is_active", true)
      .eq("curation_status", "verified")
      .maybeSingle();
    if (pointError) throw new Error("Não foi possível consultar a instituição.");
    if (!point) return null;
    const { data: info, error } = await supabaseAdmin
      .from("point_accessibility")
      .select(
        "step_free_entrance,wheelchair_access,accessible_toilet,libras_service,message_arrangement,confirmed_at",
      )
      .eq("point_id", data.point_id)
      .maybeSingle();
    if (error?.code === "42P01" || error?.code === "PGRST205") return null;
    if (error) throw new Error("Não foi possível carregar as informações de acessibilidade.");
    return info;
  });
export const getAdminAccessibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(pointInput)
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: info, error } = await supabaseAdmin
      .from("point_accessibility")
      .select(
        "step_free_entrance,wheelchair_access,accessible_toilet,libras_service,message_arrangement,confirmed_at",
      )
      .eq("point_id", data.point_id)
      .maybeSingle();
    if (error)
      throw new Error(
        "Não foi possível carregar. Confira se a migração de acessibilidade foi aplicada.",
      );
    return info;
  });
export const savePointAccessibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accessibilitySchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { confirmed, ...fields } = data;
    if (!confirmed) throw new Error("Confirme as informações com a instituição.");
    const { error } = await supabaseAdmin
      .from("point_accessibility")
      .upsert({ ...fields, confirmed_at: new Date().toISOString(), confirmed_by: context.userId });
    if (error) throw new Error("Não foi possível salvar as informações de acessibilidade.");
    return { ok: true };
  });
