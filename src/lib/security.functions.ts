import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Registra uma ação sensível na trilha de auditoria (LGPD / rastreabilidade). */
async function audit(
  supabase: any,
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  details?: Record<string, unknown>,
) {
  const { error } = await supabase.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId,
    details: details ?? null,
  });
  if (error) console.error("Falha ao registrar auditoria:", error);
}

async function assertAdmin(supabase: any) {
  const { data } = await supabase.rpc("is_admin");
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}


export type AdminUserRow = {
  id: string;
  full_name: string | null;
  role: string;
  default_city: string | null;
  created_at: string;
  is_admin: boolean;
};

export const listPlatformUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    await assertAdmin(context.supabase);

    const [{ data: profiles, error }, { data: roles }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, role, default_city, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
      context.supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);

    if (error) throw new Error("Não foi possível carregar os usuários.");

    const adminIds = new Set((roles ?? []).map((r) => r.user_id));
    return (profiles ?? []).map((p) => ({ ...p, is_admin: adminIds.has(p.id) }));
  });

const roleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["donor", "person_in_need"]),
});

export const setProfileRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => roleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);

    const { error } = await context.supabase
      .from("profiles")
      .update({ role: data.role })
      .eq("id", data.user_id);
    if (error) throw new Error("Não foi possível atualizar o perfil.");

    await audit(context.supabase, context.userId, "profile_role_updated", "profiles", data.user_id, {
      role: data.role,
    });
    return { ok: true };
  });

const adminAccessSchema = z.object({
  user_id: z.string().uuid(),
  grant: z.boolean(),
});

/** Concede ou revoga acesso administrativo. Só administradores podem chamar. */
export const setAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => adminAccessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);

    if (!data.grant && data.user_id === context.userId) {
      throw new Error("Você não pode remover seu próprio acesso administrativo.");
    }

    if (data.grant) {
      const { error } = await context.supabase
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "admin", granted_by: context.userId }, {
          onConflict: "user_id,role",
        });
      if (error) throw new Error("Não foi possível conceder o acesso.");
    } else {
      const { count } = await context.supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        throw new Error("É preciso manter pelo menos um administrador.");
      }
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
      if (error) throw new Error("Não foi possível revogar o acesso.");
    }

    await audit(
      context.supabase,
      context.userId,
      data.grant ? "admin_access_granted" : "admin_access_revoked",
      "user_roles",
      data.user_id,
    );
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);

    const { data, error } = await context.supabase
      .from("admin_audit_log")
      .select("id, actor_id, action, entity, entity_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error("Não foi possível carregar a trilha de auditoria.");
    return data ?? [];
  });

/** LGPD: portabilidade — o titular baixa todos os seus dados. */
export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const [profile, requests, points, donations] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      context.supabase.from("help_requests").select("*").eq("requester_id", uid),
      context.supabase.from("collection_points").select("*").eq("submitted_by", uid),
      context.supabase.from("voluntary_donations").select("*").eq("donor_id", uid),
    ]);

    return {
      exported_at: new Date().toISOString(),
      profile: profile.data ?? null,
      help_requests: requests.data ?? [],
      submitted_points: points.data ?? [],
      donations: donations.data ?? [],
    };
  });

/** LGPD: eliminação — apaga a conta e os dados pessoais do titular. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;

    await context.supabase.from("help_requests").delete().eq("requester_id", uid);
    await context.supabase.from("profiles").delete().eq("id", uid);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) {
      console.error("Erro ao excluir conta:", error);
      throw new Error("Não foi possível excluir a conta. Fale com a equipe.");
    }

    return { ok: true };
  });
