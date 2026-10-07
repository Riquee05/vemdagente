import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAuthorization } from "@/lib/admin-authorization";
import { assertStepUp } from "@/lib/admin-2fa.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

const INVITE_DAYS = 7;
const MAX_ATTEMPTS = 5;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
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
    entity: "team_invites",
    entity_id: entityId,
    details: (details ?? null) as Json,
  });
}

async function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10)}`;
}

async function hashPassword(password: string, salt: string) {
  const { pbkdf2Sync } = await import("node:crypto");
  return pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("hex");
}

async function safeEqual(a: string, b: string) {
  const { timingSafeEqual } = await import("node:crypto");
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export const listTeamInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    const db = await admin();
    const { data, error } = await db
      .from("team_invites")
      .select("id, team_member_id, email, status, attempts, expires_at, used_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Não foi possível carregar os convites.");
    return data ?? [];
  });

export const createTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ team_member_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    await assertStepUp(context.userId);
    const db = await admin();
    const { data: member } = await db
      .from("team_members")
      .select("id, email, full_name, status")
      .eq("id", data.team_member_id)
      .maybeSingle();
    if (!member || member.status !== "active")
      throw new Error("Ative o membro antes de liberar acesso.");

    await db
      .from("team_invites")
      .update({ status: "revoked" })
      .eq("team_member_id", member.id)
      .eq("status", "pending");
    const password = await generateTempPassword();
    const { randomBytes } = await import("node:crypto");
    const salt = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
    const { data: row, error } = await db
      .from("team_invites")
      .insert({
        team_member_id: member.id,
        email: String(member.email).trim().toLowerCase(),
        password_hash: await hashPassword(password, salt),
        password_salt: salt,
        expires_at: expiresAt,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("Não foi possível gerar o convite.");
    await audit(context.userId, "team_invite_created", row.id, {
      team_member_id: member.id,
      expires_at: expiresAt,
    });
    return { id: row.id as string, email: member.email as string, password, expires_at: expiresAt };
  });

export const revokeTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdminAuthorization(context.userId, context.supabase);
    await assertStepUp(context.userId);
    const db = await admin();
    const { error } = await db
      .from("team_invites")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error("Não foi possível revogar o convite.");
    await audit(context.userId, "team_invite_revoked", data.id);
    return { ok: true as const };
  });

async function findUserByEmail(
  db: SupabaseClient<Database>,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const users = data?.users ?? [];
    const found = users.find((user) => String(user.email ?? "").toLowerCase() === email);
    if (found) return found.id as string;
    if (users.length < 200) return null;
  }
  return null;
}

const redeemSchema = z.object({
  email: z.string().trim().email().max(255),
  temp_password: z.string().trim().min(6).max(200),
  new_password: z.string().min(8).max(200),
});

export const redeemTeamInvite = createServerFn({ method: "POST" })
  .inputValidator((data) => redeemSchema.parse(data))
  .handler(async ({ data }) => {
    const { enforceRateLimit } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("team_invite_activation", { limit: 5, windowSeconds: 15 * 60 });
    const email = data.email.trim().toLowerCase();
    const db = await admin();
    const { data: invite } = await db
      .from("team_invites")
      .select(
        "id, team_member_id, password_hash, password_salt, status, attempts, expires_at, created_by",
      )
      .eq("status", "pending")
      .ilike("email", email)
      .maybeSingle();
    const genericError = new Error("Não foi possível validar os dados informados.");
    if (!invite || invite.attempts >= MAX_ATTEMPTS) throw genericError;
    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      await db.from("team_invites").update({ status: "expired" }).eq("id", invite.id);
      await audit(null, "team_invite_failed", invite.id, { reason: "expired" });
      throw genericError;
    }
    const valid = await safeEqual(
      await hashPassword(data.temp_password.trim(), invite.password_salt),
      invite.password_hash,
    );
    if (!valid) {
      await db
        .from("team_invites")
        .update({ attempts: invite.attempts + 1 })
        .eq("id", invite.id);
      await audit(null, "team_invite_failed", invite.id, { reason: "invalid" });
      throw genericError;
    }

    const { data: member } = await db
      .from("team_members")
      .select("id, status, email")
      .eq("id", invite.team_member_id)
      .maybeSingle();
    if (!member || member.status !== "active" || String(member.email).toLowerCase() !== email)
      throw genericError;

    let userId = await findUserByEmail(db, email);
    if (userId) {
      const { error } = await db.auth.admin.updateUserById(userId, {
        password: data.new_password,
        email_confirm: true,
      });
      if (error) throw new Error("Não foi possível concluir a ativação agora.");
    } else {
      const { data: created, error } = await db.auth.admin.createUser({
        email,
        password: data.new_password,
        email_confirm: true,
      });
      if (error || !created?.user) throw new Error("Não foi possível concluir a ativação agora.");
      userId = created.user.id as string;
    }

    const { error: roleError } = await db
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "volunteer", granted_by: invite.created_by ?? null },
        { onConflict: "user_id,role" },
      );
    if (roleError) throw new Error("Não foi possível concluir a ativação agora.");

    const activatedAt = new Date().toISOString();
    const { error: memberError } = await db
      .from("team_members")
      .update({ user_id: userId, last_activated_at: activatedAt })
      .eq("id", member.id);
    if (memberError) throw new Error("Não foi possível concluir a ativação agora.");
    await db
      .from("team_invites")
      .update({ status: "used", used_by: userId, used_at: activatedAt, attempts: 0 })
      .eq("id", invite.id);
    await audit(userId, "team_invite_redeemed", invite.id, { team_member_id: member.id });
    return { ok: true as const, email };
  });
