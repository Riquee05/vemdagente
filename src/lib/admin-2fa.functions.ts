import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STEP_UP_HOURS = 2;
const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 15;

/** Verifica se a pessoa é admin ou dono (papel no banco, nunca no perfil). */
async function assertAdminAccess(supabase: any) {
  const { data } = await supabase.rpc("is_admin");
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function audit(
  actorId: string,
  action: string,
  details?: Record<string, unknown>,
) {
  const db = await admin();
  await db.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    entity: "admin_step_up",
    entity_id: actorId,
    details: details ?? null,
  });
}

/** Cliente publishable isolado, usado só para disparar/validar o código por e-mail. */
async function otpClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configuração de autenticação indisponível.");
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export type StepUpStatus = {
  isAdmin: boolean;
  isOwner: boolean;
  verified: boolean;
  expiresAt: string | null;
  email: string | null;
};

/** Diz se o painel já está liberado para esta sessão. */
export const adminStepUpStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StepUpStatus> => {
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("is_admin"),
      context.supabase.rpc("is_owner", { _user_id: context.userId }),
    ]);

    const email = (context.claims as { email?: string }).email ?? null;

    if (isAdmin !== true) {
      return { isAdmin: false, isOwner: false, verified: false, expiresAt: null, email };
    }

    const db = await admin();
    const { data } = await db
      .from("admin_step_up")
      .select("expires_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    const expiresAt = data?.expires_at ?? null;
    const verified = Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now());

    return { isAdmin: true, isOwner: isOwner === true, verified, expiresAt, email };
  });

/** Envia o código de 6 dígitos para o e-mail da conta administrativa. */
export const requestAdminCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminAccess(context.supabase);

    const email = (context.claims as { email?: string }).email;
    if (!email) throw new Error("Sua conta não tem e-mail para receber o código.");

    const db = await admin();
    const { data: state } = await db
      .from("admin_otp_attempts")
      .select("last_sent_at, blocked_until")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (state?.blocked_until && new Date(state.blocked_until).getTime() > Date.now()) {
      throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    }
    if (state?.last_sent_at && Date.now() - new Date(state.last_sent_at).getTime() < 45_000) {
      throw new Error("Aguarde alguns segundos antes de pedir um novo código.");
    }

    const client = await otpClient();
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      console.error("Falha ao enviar código do painel:", error);
      throw new Error("Não foi possível enviar o código agora. Tente de novo em instantes.");
    }

    await db.from("admin_otp_attempts").upsert(
      {
        user_id: context.userId,
        attempts: 0,
        last_sent_at: new Date().toISOString(),
        blocked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    await audit(context.userId, "admin_2fa_code_sent");

    const [name, domain] = email.split("@");
    const masked = `${(name ?? "").slice(0, 2)}${"*".repeat(Math.max((name ?? "").length - 2, 1))}@${domain ?? ""}`;
    return { ok: true, maskedEmail: masked };
  });

const verifySchema = z.object({ code: z.string().regex(/^\d{6}$/, "Código inválido.") });

/** Valida o código e libera o painel por 2 horas. */
export const verifyAdminCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => verifySchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context.supabase);

    const email = (context.claims as { email?: string }).email;
    if (!email) throw new Error("Sua conta não tem e-mail para receber o código.");

    const db = await admin();
    const { data: state } = await db
      .from("admin_otp_attempts")
      .select("attempts, blocked_until")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (state?.blocked_until && new Date(state.blocked_until).getTime() > Date.now()) {
      throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    }

    const client = await otpClient();
    const { error } = await client.auth.verifyOtp({ email, token: data.code, type: "email" });

    if (error) {
      const attempts = (state?.attempts ?? 0) + 1;
      const blocked = attempts >= MAX_ATTEMPTS;
      await db.from("admin_otp_attempts").upsert(
        {
          user_id: context.userId,
          attempts: blocked ? 0 : attempts,
          blocked_until: blocked
            ? new Date(Date.now() + BLOCK_MINUTES * 60_000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      await audit(context.userId, "admin_2fa_failed", { attempts });
      throw new Error(
        blocked
          ? "Código incorreto. Acesso bloqueado por 15 minutos."
          : "Código incorreto ou expirado.",
      );
    }

    const expiresAt = new Date(Date.now() + STEP_UP_HOURS * 60 * 60_000).toISOString();
    await db.from("admin_step_up").upsert(
      { user_id: context.userId, expires_at: expiresAt, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    await db
      .from("admin_otp_attempts")
      .upsert(
        { user_id: context.userId, attempts: 0, blocked_until: null, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    await audit(context.userId, "admin_2fa_verified", { expires_at: expiresAt });
    return { ok: true, expiresAt };
  });

/** Encerra a liberação do painel (sair da área administrativa). */
export const endAdminStepUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    await db.from("admin_step_up").delete().eq("user_id", context.userId);
    await audit(context.userId, "admin_2fa_ended");
    return { ok: true };
  });

/** Usado pelas ações sensíveis: exige painel liberado. */
export async function assertStepUp(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("admin_step_up")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.expires_at || new Date(data.expires_at).getTime() <= Date.now()) {
    throw new Error("Verificação em duas etapas expirada. Peça um novo código no painel.");
  }
}
