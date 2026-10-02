import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  volunteerApplicationSchema,
  volunteerAreaOptions,
} from "@/lib/public-submission-schemas";

type VolunteerApplicationInsert = Database["public"]["Tables"]["volunteer_applications"]["Insert"];

const areaOptions = volunteerAreaOptions;

function parseVolunteerApplication(input: unknown) {
  const parsed = volunteerApplicationSchema.safeParse(input);
  if (!parsed.success) throw new Error("Confira os campos e tente novamente.");
  return parsed.data;
}

export const volunteerStages = ["pending", "contacted", "interview", "approved", "declined"] as const;
export type VolunteerStage = (typeof volunteerStages)[number];

export const volunteerStageLabels: Record<VolunteerStage, string> = {
  pending: "Novo",
  contacted: "Em contato",
  interview: "Entrevista",
  approved: "Aprovado",
  declined: "Recusado",
};

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(volunteerStages),
  admin_notes: z.string().max(2000).optional(),
});

export const submitVolunteerApplication = createServerFn({ method: "POST" })
  .inputValidator(parseVolunteerApplication)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { enforceRateLimit, rateLimitConfig } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("volunteer_application", rateLimitConfig("VOLUNTEER"));

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"];
    if (!key || !url) throw new Error("Não foi possível enviar sua inscrição. Tente novamente.");
    const supabasePublic = createClient<Database>(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const insert: VolunteerApplicationInsert = {
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      city: data.city || null,
      state: data.state || null,
      areas: data.areas,
      availability: data.availability || null,
      experience: data.experience || null,
      motivation: data.motivation || null,
      heard_from: data.heard_from || null,
      status: "pending",
    };

    const { error } = await supabasePublic.from("volunteer_applications").insert(insert);

    if (error) {
      console.error("Erro ao salvar inscrição de voluntário:", error);
      throw new Error("Não foi possível enviar sua inscrição. Tente novamente.");
    }

    return { ok: true };
  });

export const listVolunteerApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    const { data, error } = await context.supabase
      .from("volunteer_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao listar voluntários:", error);
      throw new Error("Não foi possível carregar as inscrições.");
    }

    return data ?? [];
  });

export const updateVolunteerApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => statusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    const { data: current } = await context.supabase
      .from("volunteer_applications")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();

    const patch: { status: VolunteerStage; admin_notes?: string | null } = { status: data.status };
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes || null;

    const { error } = await context.supabase
      .from("volunteer_applications")
      .update(patch)
      .eq("id", data.id);

    if (error) {
      console.error("Erro ao atualizar status:", error);
      throw new Error("Não foi possível atualizar a inscrição.");
    }

    if (current?.status !== data.status) {
      await context.supabase.from("volunteer_stage_events").insert({
        application_id: data.id,
        from_status: current?.status ?? null,
        to_status: data.status,
        changed_by: context.userId,
      });
    }

    return { ok: true };
  });

export const listVolunteerStageEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ application_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    const { data: rows, error } = await context.supabase
      .from("volunteer_stage_events")
      .select("id, from_status, to_status, created_at")
      .eq("application_id", data.application_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Não foi possível carregar o histórico.");
    return rows ?? [];
  });

export { areaOptions };
export const areaLabels: Record<(typeof areaOptions)[number], string> = {
  "verificacao-pontos": "Verificação de pontos",
  curadoria: "Curadoria",
  divulgacao: "Divulgação",
  "suporte-usuarios": "Suporte aos usuários",
  tech: "Tecnologia / Desenvolvimento",
  design: "Design",
  traducao: "Tradução",
  outro: "Outro",
};
