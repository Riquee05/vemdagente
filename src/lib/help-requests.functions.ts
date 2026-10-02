import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import type { Database } from "@/integrations/supabase/types";
import { helpRequestSchema } from "@/lib/public-submission-schemas";

function parseHelpRequest(input: unknown) {
  const parsed = helpRequestSchema.safeParse(input);
  if (!parsed.success) throw new Error("Confira os campos e tente novamente.");
  return parsed.data;
}

export const submitHelpRequest = createServerFn({ method: "POST" })
  .inputValidator(parseHelpRequest)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { enforceRateLimit, rateLimitConfig } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("help_request", rateLimitConfig("HELP"));

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Não foi possível registrar seu pedido agora. Tente novamente.");

    const authHeader = getRequest().headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const supabasePublic = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const user = token ? (await supabasePublic.auth.getUser(token)).data.user : null;
    const { error } = await supabasePublic.from("help_requests").insert({
      requester_id: user?.id ?? null,
      category_id: data.category_id,
      city: data.city,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      note: data.note ?? null,
    });

    if (error) {
      console.error("Erro ao registrar pedido de ajuda:", error);
      throw new Error("Não foi possível registrar seu pedido agora. Tente novamente.");
    }
    return { ok: true };
  });
