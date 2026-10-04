export const teamPermissions = [
  "points_review",
  "needs_management",
  "volunteer_management",
  "help_support",
  "content_management",
] as const;

export type TeamPermission = (typeof teamPermissions)[number];

export type ActiveTeamMember = {
  id: string;
  user_id: string | null;
  full_name: string;
  role_title: string;
  status: string;
  areas: string[];
  permissions: string[];
  last_activated_at: string | null;
};

type AccessClient = {
  from: (table: "team_members" | "user_roles") => any;
};

export async function requireActiveTeamMember(
  userId: string | null | undefined,
  supabase: AccessClient | null | undefined,
): Promise<ActiveTeamMember> {
  if (!userId || !supabase) throw new Error("Unauthorized");
  const { data: role } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "volunteer")
    .maybeSingle();
  if (!role) throw new Error("Acesso restrito a colaboradores.");

  const { data: member } = await supabase
    .from("team_members")
    .select("id, user_id, full_name, role_title, status, areas, permissions, last_activated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!member || member.status !== "active") {
    throw new Error("Seu acesso de colaborador está pausado ou inativo. Procure o responsável.");
  }
  return member as ActiveTeamMember;
}

export async function requireVolunteer(
  userId: string | null | undefined,
  supabase: AccessClient | null | undefined,
): Promise<ActiveTeamMember> {
  return requireActiveTeamMember(userId, supabase);
}

export async function requireTeamPermission(
  userId: string | null | undefined,
  supabase: AccessClient | null | undefined,
  permission: TeamPermission,
): Promise<ActiveTeamMember> {
  const member = await requireActiveTeamMember(userId, supabase);
  if (!member.permissions.includes(permission)) {
    throw new Error("Você não tem permissão para esta atividade. Procure o responsável.");
  }
  return member;
}
