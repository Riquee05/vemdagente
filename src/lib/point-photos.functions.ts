import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "point-photos";
const inputSchema = z.object({
  path: z
    .string()
    .trim()
    .min(3)
    .max(500)
    .refine((path) => !path.startsWith("http")),
});

async function signPhoto(path: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) throw new Error("Foto indisponível.");
  return { url: data.signedUrl };
}

export const getPublishedPointPhotoUrl = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Foto indisponível.");

    const publicClient = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: point, error } = await publicClient
      .from("collection_points")
      .select("id")
      .eq("photo_url", data.path)
      .eq("is_active", true)
      .eq("curation_status", "verified")
      .eq("state", "SP")
      .maybeSingle();

    if (error || !point) throw new Error("Foto indisponível.");
    return signPhoto(data.path);
  });

export const getAdminPointPhotoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin");
    if (error || !isAdmin) throw new Error("Acesso restrito.");
    return signPhoto(data.path);
  });
