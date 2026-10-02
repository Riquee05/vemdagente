import { createHmac } from "node:crypto";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";

import {
  assertRateLimitAllowed,
  readPositiveInteger,
  type RateLimitConfig,
  type RateLimitScope,
} from "@/lib/rate-limit";

function requestFingerprint(): string {
  const request = getRequest();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip") ??
    forwarded ??
    request.headers.get("x-real-ip") ??
    `unknown:${request.headers.get("user-agent") ?? "unknown"}`
  );
}

export async function enforceRateLimit(
  scope: RateLimitScope,
  config: RateLimitConfig,
): Promise<void> {
  const secret = process.env["RATE_LIMIT_HASH_SECRET"];
  if (!secret) {
    console.error("RATE_LIMIT_HASH_SECRET não está configurado.");
    throw new Error("Não foi possível concluir o envio agora. Tente novamente.");
  }

  const identifierHash = createHmac("sha256", secret).update(requestFingerprint()).digest("hex");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("consume_request_rate_limit", {
    p_scope: scope,
    p_identifier_hash: identifierHash,
    p_limit: config.limit,
    p_window_seconds: config.windowSeconds,
  });

  if (error || data == null) {
    console.error("Falha ao verificar limite de requisições:", error?.message ?? "sem resposta");
    throw new Error("Não foi possível concluir o envio agora. Tente novamente.");
  }

  if (!data) setResponseStatus(429);
  assertRateLimitAllowed(data);
}

export function rateLimitConfig(prefix: "HELP" | "VOLUNTEER" | "ASSISTANT"): RateLimitConfig {
  const defaults = {
    HELP: { limit: 5, windowSeconds: 60 * 60 },
    VOLUNTEER: { limit: 3, windowSeconds: 24 * 60 * 60 },
    ASSISTANT: { limit: 20, windowSeconds: 10 * 60 },
  } as const;

  return {
    limit: readPositiveInteger(process.env[`RATE_LIMIT_${prefix}_MAX`], defaults[prefix].limit),
    windowSeconds: readPositiveInteger(
      process.env[`RATE_LIMIT_${prefix}_WINDOW_SECONDS`],
      defaults[prefix].windowSeconds,
    ),
  };
}
