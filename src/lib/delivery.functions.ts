import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAuthorization } from "@/lib/admin-authorization";
import { deliverySchema } from "@/lib/donation-planning";
const pointInput = (input: unknown) => z.object({ point_id: z.string().uuid() }).parse(input);
export const getPublicDelivery = createServerFn({ method: "GET" })
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
      .from("point_delivery")
      .select("drop_off,pickup,appointment,confirmed_at")
      .eq("point_id", data.point_id)
      .maybeSingle();
    if (error?.code === "42P01" || error?.code === "PGRST205") return null;
    if (error)
      throw new Error("Não foi possível carregar as informações de entrega e agendamento.");
    return info;
  });
export const getAdminDelivery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(pointInput)
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: info, error } = await supabaseAdmin
      .from("point_delivery")
      .select("drop_off,pickup,appointment,confirmed_at")
      .eq("point_id", data.point_id)
      .maybeSingle();
    if (error)
      throw new Error(
        "Não foi possível carregar. Confira se a migração de entrega e agendamento foi aplicada.",
      );
    return info;
  });
export const savePointDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deliverySchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { confirmed, ...fields } = data;
    if (!confirmed) throw new Error("Confirme as informações com a instituição.");
    const { error } = await supabaseAdmin
      .from("point_delivery")
      .upsert({ ...fields, confirmed_at: new Date().toISOString(), confirmed_by: context.userId });
    if (error) throw new Error("Não foi possível salvar as informações de entrega e agendamento.");
    return { ok: true };
  });
