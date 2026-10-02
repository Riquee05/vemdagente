import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStepUp } from "@/lib/admin-2fa.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

const INVITE_DAYS = 7;
const MAX_ATTEMPTS = 5;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function assertOwner(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_owner", { _user_id: userId });
  if (data !== true) {
    throw new Error("Apenas o dono da plataforma pode gerenciar convites de administração.");
  }
}

async function audit(
  actorId: string | null,
  action: string,
  entityId: string | null,
  details?: Record<string, unknown>,
) {
  const db = await admin();
  await db.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    entity: "admin_invites",
    entity_id: entityId,
    details: details ?? null,
  });
}

/** Senha temporária legível, com entropia alta (~62 bits). */
async function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10)}`;
}

async function hashPassword(password: string, salt: string) {
  const { pbkdf2Sync } = await import("node:crypto");
  return pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
}

async function safeEqual(a: string, b: string) {
  const { timingSafeEqual } = await import("node:crypto");
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type AdminInviteRow = {
  id: string;
  application_id: string | null;
  email: string;
  full_name: string | null;
  status: "pending" | "used" | "revoked" | "expired";
  attempts: number;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

/** Lista os convites (sem nunca devolver a senha). Só o dono. */
export const listAdminInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminInviteRow[]> => {
    await assertOwner(context.supabase, context.userId);

    const db = await admin();
    const { data, error } = await db
      .from("admin_invites")
      .select("id, application_id, email, full_name, status, attempts, expires_at, used_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error("Não foi possível carregar os convites.");
    return (data ?? []) as AdminInviteRow[];
  });

const createSchema = z.object({ application_id: z.string().uuid() });

/**
 * Gera a senha temporária para uma candidatura aprovada.
 * A senha em texto é devolvida SOMENTE nesta resposta; o banco guarda apenas o hash.
 */
export const createAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    await assertStepUp(context.userId);

    const db = await admin();
    const { data: application } = await db
      .from("volunteer_applications")
      .select("id, full_name, email, status")
      .eq("id", data.application_id)
      .maybeSingle();

    if (!application) throw new Error("Candidatura não encontrada.");
    if (application.status !== "approved") {
      throw new Error("Aprove a candidatura antes de gerar a senha temporária.");
    }

    const email = String(application.email).trim().toLowerCase();

    // Invalida convites pendentes anteriores do mesmo e-mail.
    await db
      .from("admin_invites")
      .update({ status: "revoked" })
      .eq("status", "pending")
      .ilike("email", email);

    const password = await generateTempPassword();
    const { randomBytes } = await import("node:crypto");
    const salt = randomBytes(16).toString("hex");
    const password_hash = await hashPassword(password, salt);
    const expires_at = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60_000).toISOString();

    const { data: row, error } = await db
      .from("admin_invites")
      .insert({
        application_id: application.id,
        email,
        full_name: application.full_name,
        password_hash,
        password_salt: salt,
        status: "pending",
        expires_at,
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error("Erro ao criar convite:", error);
      throw new Error("Não foi possível gerar a senha temporária.");
    }

    await audit(context.userId, "admin_invite_created", row.id, { email, expires_at });

    return { ok: true as const, id: row.id as string, email, password, expires_at };
  });

const revokeSchema = z.object({ id: z.string().uuid() });

export const revokeAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => revokeSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    await assertStepUp(context.userId);

    const db = await admin();
    const { error } = await db
      .from("admin_invites")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("status", "pending");

    if (error) throw new Error("Não foi possível revogar o convite.");
    await audit(context.userId, "admin_invite_revoked", data.id);
    return { ok: true as const };
  });

async function findUserByEmail(db: any, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const users = data?.users ?? [];
    const found = users.find((u: any) => String(u.email ?? "").toLowerCase() === email);
    if (found) return found.id as string;
    if (users.length < 200) return null;
  }
  return null;
}

const redeemSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  temp_password: z.string().trim().min(6, "Informe a senha temporária").max(200),
  new_password: z
    .string()
    .min(8, "A nova senha precisa ter pelo menos 8 caracteres")
    .max(200),
});

/**
 * Ativa o acesso administrativo: valida a senha temporária, define a senha
 * definitiva da conta e concede o papel de administrador.
 */
export const redeemAdminInvite = createServerFn({ method: "POST" })
  .inputValidator((data) => redeemSchema.parse(data))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const db = await admin();

    const { data: invite } = await db
      .from("admin_invites")
      .select("id, email, password_hash, password_salt, status, attempts, expires_at")
      .eq("status", "pending")
      .ilike("email", email)
      .maybeSingle();

    const genericError = new Error("E-mail ou senha temporária inválidos.");
    if (!invite) throw genericError;

    if (invite.attempts >= MAX_ATTEMPTS) {
      throw new Error("Muitas tentativas para este convite. Peça uma nova senha ao dono.");
    }

    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      await db.from("admin_invites").update({ status: "expired" }).eq("id", invite.id);
      throw new Error("Este convite expirou. Peça uma nova senha temporária ao dono.");
    }

    const attempt = await hashPassword(data.temp_password.trim(), invite.password_salt);
    const ok = await safeEqual(attempt, invite.password_hash);

    if (!ok) {
      await db
        .from("admin_invites")
        .update({ attempts: (invite.attempts ?? 0) + 1 })
        .eq("id", invite.id);
      await audit(null, "admin_invite_failed", invite.id, { email });
      throw genericError;
    }

    let userId = await findUserByEmail(db, email);

    if (userId) {
      const { error } = await db.auth.admin.updateUserById(userId, {
        password: data.new_password,
        email_confirm: true,
      });
      if (error) {
        console.error("Erro ao atualizar conta:", error);
        throw new Error("Não foi possível definir sua senha. Tente novamente.");
      }
    } else {
      const { data: created, error } = await db.auth.admin.createUser({
        email,
        password: data.new_password,
        email_confirm: true,
      });
      if (error || !created?.user) {
        console.error("Erro ao criar conta:", error);
        throw new Error("Não foi possível criar sua conta. Tente novamente.");
      }
      userId = created.user.id as string;
    }

    const { error: roleError } = await db
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleError && !String(roleError.message).includes("duplicate")) {
      console.error("Erro ao conceder papel admin:", roleError);
      throw new Error("Conta criada, mas não conseguimos liberar o acesso. Fale com o dono.");
    }

    await db
      .from("admin_invites")
      .update({
        status: "used",
        used_by: userId,
        used_at: new Date().toISOString(),
        attempts: 0,
      })
      .eq("id", invite.id);

    await audit(userId, "admin_invite_redeemed", invite.id, { email });

    return { ok: true as const, email };
  });
