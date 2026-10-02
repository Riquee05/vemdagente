import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAuthorization } from "@/lib/admin-authorization";

export const teamStatuses = ["active", "paused", "inactive"] as const;
export type TeamStatus = (typeof teamStatuses)[number];

export const teamStatusLabels: Record<TeamStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  inactive: "Inativo",
};

const memberSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().max(40).optional(),
  role_title: z.string().trim().min(2, "Informe a função").max(120),
  areas: z.array(z.string().max(60)).max(12).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(10).optional(),
  status: z.enum(teamStatuses).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);

    const { data, error } = await context.supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao listar time:", error);
      throw new Error("Não foi possível carregar o time.");
    }
    return data ?? [];
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => memberSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);

    const { error } = await context.supabase.from("team_members").insert({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      role_title: data.role_title,
      areas: data.areas ?? [],
      city: data.city || null,
      state: data.state || null,
      status: data.status ?? "active",
      notes: data.notes || null,
    });

    if (error) {
      console.error("Erro ao criar colaborador:", error);
      throw new Error(
        error.code === "23505" || error.message.includes("duplicate")
          ? "Já existe alguém no time com este e-mail."
          : "Não foi possível adicionar a pessoa ao time.",
      );
    }
    return { ok: true };
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        role_title: z.string().trim().min(2).max(120).optional(),
        status: z.enum(teamStatuses).optional(),
        notes: z.string().trim().max(2000).optional(),
        phone: z.string().trim().max(40).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);

    const patch: Partial<{ role_title: string; status: string; notes: string; phone: string }> = {};
    if (data.role_title !== undefined) patch.role_title = data.role_title;
    if (data.status !== undefined) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.phone !== undefined) patch.phone = data.phone;

    const { error } = await context.supabase.from("team_members").update(patch).eq("id", data.id);
    if (error) {
      console.error("Erro ao atualizar colaborador:", error);
      throw new Error("Não foi possível atualizar a pessoa do time.");
    }
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const { error } = await context.supabase.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível remover a pessoa do time.");
    return { ok: true };
  });

/** Cria (ou reutiliza) um colaborador a partir de uma candidatura aprovada. */
export const promoteApplicationToTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ application_id: z.string().uuid(), role_title: z.string().trim().max(120).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);

    const { data: app, error: appError } = await context.supabase
      .from("volunteer_applications")
      .select("*")
      .eq("id", data.application_id)
      .maybeSingle();

    if (appError || !app) throw new Error("Candidatura não encontrada.");

    const { data: existing } = await context.supabase
      .from("team_members")
      .select("id")
      .eq("application_id", app.id)
      .maybeSingle();

    if (existing) return { ok: true, created: false };

    const { error } = await context.supabase.from("team_members").insert({
      full_name: app.full_name,
      email: app.email,
      phone: app.phone,
      role_title: data.role_title || "Voluntário",
      areas: app.areas ?? [],
      city: app.city,
      state: app.state,
      status: "active",
      application_id: app.id,
    });

    if (error) {
      console.error("Erro ao promover candidatura:", error);
      throw new Error(
        error.message.includes("duplicate")
          ? "Já existe alguém no time com este e-mail."
          : "Não foi possível adicionar ao time.",
      );
    }

    if (app.status !== "approved") {
      await context.supabase
        .from("volunteer_applications")
        .update({ status: "approved" })
        .eq("id", app.id);
      await context.supabase.from("volunteer_stage_events").insert({
        application_id: app.id,
        from_status: app.status,
        to_status: "approved",
        changed_by: context.userId,
      });
    }

    return { ok: true, created: true };
  });

export type AdminOverview = {
  points: { verified: number; pending: number; rejected: number; inactive: number };
  helpRequests: { total: number; open: number };
  volunteers: Record<string, number>;
  team: { active: number; total: number };
  recentPoints: { id: string; name: string; city: string; curation_status: string; created_at: string }[];
  recentApplications: { id: string; full_name: string; city: string | null; status: string; created_at: string }[];
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const sb = context.supabase;

    const count = async (
      table: "collection_points" | "help_requests" | "volunteer_applications" | "team_members",
      apply: (q: any) => any = (q) => q,
    ) => {
      const { count: total } = await apply(sb.from(table).select("id", { count: "exact", head: true }));
      return total ?? 0;
    };

    const [verified, pending, rejected, inactive, helpTotal, helpOpen, teamTotal, teamActive] =
      await Promise.all([
        count("collection_points", (q) => q.eq("curation_status", "verified").eq("is_active", true)),
        count("collection_points", (q) => q.eq("curation_status", "pending")),
        count("collection_points", (q) => q.eq("curation_status", "rejected")),
        count("collection_points", (q) => q.eq("is_active", false)),
        count("help_requests"),
        count("help_requests", (q) => q.eq("status", "open")),
        count("team_members"),
        count("team_members", (q) => q.eq("status", "active")),
      ]);

    const stages = ["pending", "contacted", "interview", "approved", "declined"] as const;
    const stageCounts = await Promise.all(
      stages.map((s) => count("volunteer_applications", (q) => q.eq("status", s))),
    );
    const volunteers: Record<string, number> = {};
    stages.forEach((s, i) => (volunteers[s] = stageCounts[i] ?? 0));

    const { data: recentPoints } = await sb
      .from("collection_points")
      .select("id, name, city, curation_status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentApplications } = await sb
      .from("volunteer_applications")
      .select("id, full_name, city, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      points: { verified, pending, rejected, inactive },
      helpRequests: { total: helpTotal, open: helpOpen },
      volunteers,
      team: { active: teamActive, total: teamTotal },
      recentPoints: recentPoints ?? [],
      recentApplications: recentApplications ?? [],
    };
  });
