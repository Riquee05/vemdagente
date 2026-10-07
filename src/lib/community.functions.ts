import { readInstitutionProposal } from "@/lib/institution-workspace";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAuthorization } from "@/lib/admin-authorization";
import { testimonialSchema, institutionClaimSchema } from "@/lib/community-schemas";

export const listPublishedTestimonials = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ page: z.number().int().min(1).max(10000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      data: rows,
      error,
      count,
    } = await supabaseAdmin
      .from("testimonials")
      .select("id,display_name,city,rating,story,reviewed_at", { count: "exact" })
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .order("id")
      .range((data.page - 1) * 12, data.page * 12 - 1);
    if (error) throw new Error("Não foi possível carregar os relatos. Tente novamente.");
    return { items: rows ?? [], total: count ?? 0 };
  });
export const submitTestimonial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => testimonialSchema.parse(input))
  .handler(async ({ data }) => {
    const { enforceRateLimit } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("testimonial_submission", { limit: 3, windowSeconds: 86400 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("testimonials").insert({
      display_name: data.display_name,
      city: data.city || null,
      rating: data.rating,
      story: data.story,
      status: "pending",
      consent_at: new Date().toISOString(),
    });
    if (error) throw new Error("Não foi possível enviar o relato. Tente novamente.");
    return { ok: true };
  });
export const requestInstitutionAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => institutionClaimSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { enforceRateLimit } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("institution_claim", { limit: 5, windowSeconds: 86400 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: point, error: pointError } = await supabaseAdmin
      .from("collection_points")
      .select("id,claimed_by")
      .eq("id", data.point_id)
      .eq("state", "SP")
      .eq("curation_status", "verified")
      .eq("is_active", true)
      .maybeSingle();
    if (pointError || !point) throw new Error("Instituição indisponível.");
    if (point.claimed_by)
      throw new Error("A instituição já possui responsável. Contate a administração.");
    const { error } = await supabaseAdmin.from("institution_claims").insert({
      ...data,
      user_id: context.userId,
      status: "pending",
    });
    if (error?.code === "23505") throw new Error("Sua solicitação já está aguardando revisão.");
    if (error) throw new Error("Não foi possível enviar a solicitação.");
    return { ok: true };
  });

export const listCommunityReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(["pending", "approved", "rejected"]),
        page: z.number().int().min(1).max(10000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [stories, claims, corrections] = await Promise.all([
      supabaseAdmin
        .from("testimonials")
        .select("*", { count: "exact" })
        .eq("status", data.status)
        .order("created_at", { ascending: false })
        .order("id")
        .range((data.page - 1) * 20, data.page * 20 - 1),
      supabaseAdmin
        .from("institution_claims")
        .select("*", { count: "exact" })
        .eq("status", data.status)
        .order("created_at", { ascending: false })
        .order("id")
        .range((data.page - 1) * 20, data.page * 20 - 1),
      supabaseAdmin
        .from("point_corrections")
        .select("*", { count: "exact" })
        .eq("status", { pending: "open", approved: "resolved", rejected: "dismissed" }[data.status])
        .order("created_at", { ascending: false })
        .order("id")
        .range((data.page - 1) * 20, data.page * 20 - 1),
    ]);
    if (stories.error || claims.error || corrections.error)
      throw new Error("Não foi possível carregar a revisão.");
    return {
      stories: stories.data ?? [],
      claims: claims.data ?? [],
      corrections: corrections.data ?? [],
      total: Math.max(stories.count ?? 0, claims.count ?? 0, corrections.count ?? 0),
    };
  });
export const reviewCommunitySubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(["testimonial", "claim", "correction"]),
        status: z.enum(["approved", "rejected"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    if (data.kind === "claim") {
      const { error } = await context.supabase.rpc("review_institution_claim", {
        p_id: data.id,
        p_status: data.status,
      });
      if (error)
        throw new Error(
          "Não foi possível revisar. Verifique se há outro responsável ou se o pedido já foi revisado.",
        );
    } else if (data.kind === "correction") {
      const { data: correction, error: readError } = await context.supabase
        .from("point_corrections")
        .select("message,status")
        .eq("id", data.id)
        .maybeSingle();
      if (readError || !correction || correction.status !== "open")
        throw new Error("Correção já revisada ou ausente.");
      if (data.status === "approved" && readInstitutionProposal(correction.message)) {
        const { error } = await context.supabase.rpc("apply_institution_proposal", {
          p_id: data.id,
        });
        if (error)
          throw new Error(
            "Não foi possível aplicar a proposta. Confira a migração, o vínculo e se a ficha mudou desde o envio.",
          );
      } else {
        const { error } = await context.supabase
          .from("point_corrections")
          .update({ status: data.status === "approved" ? "resolved" : "dismissed" })
          .eq("id", data.id)
          .eq("status", "open");
        if (error) throw new Error("Não foi possível revisar a correção.");
      }
    } else {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("testimonials")
        .update({
          status: data.status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: context.userId,
        })
        .eq("id", data.id)
        .select("id");
      if (error || !rows?.length) throw new Error("Não foi possível salvar a revisão.");
    }
    return { ok: true };
  });
