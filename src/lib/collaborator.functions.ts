import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveTeamMember, requireTeamPermission } from "@/lib/collaborator-authorization";

export const getCollaboratorOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const member = await requireActiveTeamMember(context.userId, context.supabase);
    const [help, pendingPoints, corrections] = await Promise.all([
      member.permissions.includes("help_support")
        ? context.supabase
            .from("help_requests")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to", member.id)
        : Promise.resolve({ count: 0 }),
      member.permissions.includes("points_review")
        ? context.supabase
            .from("collection_points")
            .select("id", { count: "exact", head: true })
            .eq("curation_status", "pending")
        : Promise.resolve({ count: 0 }),
      member.permissions.includes("points_review")
        ? context.supabase
            .from("point_corrections")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending")
        : Promise.resolve({ count: 0 }),
    ]);
    return {
      member,
      counts: {
        help: help.count ?? 0,
        points: pendingPoints.count ?? 0,
        corrections: corrections.count ?? 0,
      },
    };
  });

export const listCollaboratorPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeamPermission(context.userId, context.supabase, "points_review");
    const [{ data: points, error }, { data: corrections }] = await Promise.all([
      context.supabase
        .from("collection_points")
        .select(
          "id, name, address, city, state, source, curation_status, confirmation_status, created_at",
        )
        .eq("curation_status", "pending")
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("point_corrections")
        .select("id, point_id, message, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (error) throw new Error("Não foi possível carregar a fila de pontos.");
    return { points: points ?? [], corrections: corrections ?? [] };
  });

export const listCollaboratorNeedsPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeamPermission(context.userId, context.supabase, "needs_management");
    const { data, error } = await context.supabase
      .from("collection_points")
      .select("id, name, address, city, state, curation_status, point_needs ( id, is_active )")
      .eq("curation_status", "verified")
      .order("name")
      .limit(400);
    if (error) throw new Error("Não foi possível carregar os pontos.");
    return data ?? [];
  });

export const listAssignedHelpRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const member = await requireTeamPermission(context.userId, context.supabase, "help_support");
    const { data, error } = await context.supabase
      .from("help_requests")
      .select(
        "id, category_id, city, note, status, created_at, updated_at, item_categories ( label )",
      )
      .eq("assigned_to", member.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os atendimentos atribuídos.");
    return data ?? [];
  });

export const updateAssignedHelpRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["open", "in_progress", "closed"]) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const member = await requireTeamPermission(context.userId, context.supabase, "help_support");
    const { error } = await context.supabase
      .from("help_requests")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("assigned_to", member.id);
    if (error) throw new Error("Não foi possível atualizar o atendimento.");
    return { ok: true as const };
  });

export const listVolunteerWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeamPermission(context.userId, context.supabase, "volunteer_management");
    const [{ data: applications, error }, { data: team }] = await Promise.all([
      context.supabase
        .from("volunteer_applications")
        .select("id, full_name, city, state, areas, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      context.supabase
        .from("team_members")
        .select("id, full_name, role_title, areas, city, state, status")
        .order("full_name")
        .limit(200),
    ]);
    if (error) throw new Error("Não foi possível carregar voluntários.");
    return { applications: applications ?? [], team: team ?? [] };
  });

export const listInstitutionalContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTeamPermission(context.userId, context.supabase, "content_management");
    const { data, error } = await context.supabase
      .from("project_settings")
      .select("key, value, updated_at")
      .order("key");
    if (error) throw new Error("Não foi possível carregar o conteúdo institucional.");
    return data ?? [];
  });
