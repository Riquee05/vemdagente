import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAuthorization } from "@/lib/admin-authorization";
import {
  campaignSchema,
  feedbackSchema,
  institutionProposalSchema,
} from "@/lib/institution-workspace";

export const getManagedInstitution = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ point_id: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: point, error } = await context.supabase
      .from("collection_points")
      .select(
        "id,name,phone,whatsapp,website,opening_hours,donation_hours,description,updated_at,claimed_by",
      )
      .eq("id", data.point_id)
      .eq("claimed_by", context.userId)
      .maybeSingle();
    if (error || !point)
      throw new Error("Atualizações disponíveis após aprovação do vínculo com a instituição.");
    return point;
  });
export const proposeInstitutionUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => institutionProposalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: point, error } = await context.supabase
      .from("collection_points")
      .select("id,updated_at")
      .eq("id", data.point_id)
      .eq("claimed_by", context.userId)
      .maybeSingle();
    if (error || !point) throw new Error("Você não possui vínculo aprovado com esta instituição.");
    if (point.updated_at !== data.baseline_updated_at)
      throw new Error("A ficha mudou. Recarregue antes de propor a atualização.");
    const { enforceRateLimit } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("institution_claim", { limit: 5, windowSeconds: 86400 });
    const message = JSON.stringify({
      type: "institution_update_v1",
      baseline_updated_at: data.baseline_updated_at,
      patch: data.patch,
    });
    if (message.length > 2000)
      throw new Error("Proposta muito extensa. Reduza a apresentação ou os horários.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: saveError } = await supabaseAdmin.from("point_corrections").insert({
      point_id: data.point_id,
      submitted_by: context.userId,
      message,
      status: "open",
    });
    if (saveError) throw new Error("Não foi possível enviar a proposta.");
    return { ok: true };
  });
export const submitContactFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data }) => {
    const { enforceRateLimit } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("institution_claim", { limit: 5, windowSeconds: 86400 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: point, error: lookupError } = await supabaseAdmin
      .from("collection_points")
      .select("id")
      .eq("id", data.point_id)
      .eq("state", "SP")
      .eq("is_active", true)
      .eq("curation_status", "verified")
      .maybeSingle();
    if (lookupError || !point) throw new Error("Instituição indisponível.");
    const labels = {
      phone: "Telefone não funciona",
      item: "Não recebe mais este item",
      hours: "Horário diferente",
      closed: "Local fechado ou mudou de endereço",
      other: "Outra informação",
    };
    const { error } = await supabaseAdmin.from("point_corrections").insert({
      point_id: data.point_id,
      message: `${labels[data.kind]}: ${data.message}`,
      contact: data.contact || null,
      status: "open",
    });
    if (error)
      throw new Error("Não foi possível enviar. Seus dados foram preservados; tente novamente.");
    return { ok: true };
  });
export const saveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ need_id: z.uuid().optional(), campaign: campaignSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: point } = await context.supabase
      .from("collection_points")
      .select("claimed_by")
      .eq("id", data.campaign.point_id)
      .maybeSingle();
    const { data: admin } = await context.supabase.rpc("is_admin");
    if (!point || (point.claimed_by !== context.userId && admin !== true))
      throw new Error("Acesso restrito ao responsável aprovado ou administrador.");
    const patch = {
      category_id: data.campaign.category_id,
      campaign_title: data.campaign.title,
      target_quantity: data.campaign.target,
      received_quantity: data.campaign.received,
      quantity_unit: data.campaign.unit,
      expires_at: data.campaign.expires_at,
      is_active: data.campaign.received < data.campaign.target,
    };
    const query = data.need_id
      ? context.supabase
          .from("point_needs")
          .update(patch)
          .eq("id", data.need_id)
          .eq("point_id", data.campaign.point_id)
      : context.supabase
          .from("point_needs")
          .insert({ ...patch, point_id: data.campaign.point_id, urgency: "normal" });
    const { data: rows, error } = await query.select("id");
    if (error?.code === "42703" || error?.code === "PGRST204")
      throw new Error("Aplique a migração de campanhas no banco antes de salvar.");
    if (error || !rows?.length) throw new Error("Não foi possível salvar a campanha.");
    return { ok: true };
  });
export const listManagedCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ point_id: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: point } = await context.supabase
      .from("collection_points")
      .select("claimed_by")
      .eq("id", data.point_id)
      .maybeSingle();
    const { data: admin } = await context.supabase.rpc("is_admin");
    if (!point || (point.claimed_by !== context.userId && admin !== true))
      throw new Error("Acesso restrito ao responsável aprovado ou administrador.");
    const { data: rows, error } = await context.supabase
      .from("point_needs")
      .select(
        "id,category_id,campaign_title,target_quantity,received_quantity,quantity_unit,expires_at,is_active",
      )
      .eq("point_id", data.point_id)
      .not("campaign_title", "is", null)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("As campanhas precisam da migração aplicada no banco.");
    return rows ?? [];
  });
export const getProjectHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { saoPauloToday } = await import("@/lib/need-validity");
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    const [contact, stale, corrections, expired, claims] = await Promise.all([
      context.supabase
        .from("collection_points")
        .select("id", { count: "exact", head: true })
        .eq("state", "SP")
        .eq("is_active", true)
        .eq("curation_status", "verified")
        .is("phone", null)
        .is("whatsapp", null)
        .is("website", null),
      context.supabase
        .from("collection_points")
        .select("id", { count: "exact", head: true })
        .eq("state", "SP")
        .eq("is_active", true)
        .eq("curation_status", "verified")
        .or(`confirmed_at.is.null,confirmed_at.lt.${cutoff},confirmation_status.eq.needs_update`),
      context.supabase
        .from("point_corrections")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      context.supabase
        .from("point_needs")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .lt("expires_at", saoPauloToday()),
      context.supabase
        .from("institution_claims")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);
    if ([contact, stale, corrections, expired, claims].some((result) => result.error))
      throw new Error("Não foi possível atualizar os indicadores.");
    return {
      contact: contact.count ?? 0,
      stale: stale.count ?? 0,
      corrections: corrections.count ?? 0,
      expired: expired.count ?? 0,
      claims: claims.count ?? 0,
      checked_at: new Date().toISOString(),
    };
  });
