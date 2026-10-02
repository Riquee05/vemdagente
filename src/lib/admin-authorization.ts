type AdminAuthorizationClient = {
  rpc: (name: "is_admin") => Promise<{ data: boolean | null }>;
};

export async function requireAdminAuthorization(
  userId: string | null | undefined,
  supabase: AdminAuthorizationClient | null | undefined,
): Promise<void> {
  if (!userId || !supabase) throw new Error("Unauthorized");

  const { data } = await supabase.rpc("is_admin");
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}
