import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type VolunteerApplicationInsert = Database["public"]["Tables"]["volunteer_applications"]["Insert"];

const areaOptions = [
  "verificacao-pontos",
  "curadoria",
  "divulgacao",
  "suporte-usuarios",
  "tech",
  "design",
  "traducao",
  "outro",
] as const;

const submitSchema = z.object({
  full_name: z.string().trim().min(2, "Nome completo é obrigatório").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(10).optional(),
  areas: z.array(z.enum(areaOptions)).min(1, "Escolha pelo menos uma área de interesse"),
  availability: z.string().trim().max(500).optional(),
  experience: z.string().trim().max(1000).optional(),
  motivation: z.string().trim().max(1000).optional(),
  heard_from: z.string().trim().max(255).optional(),
});

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "contacted", "approved", "declined"]),
  admin_notes: z.string().max(2000).optional(),
});

export const submitVolunteerApplication = createServerFn({ method: "POST" })
  .inputValidator((data) => submitSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: true; id: string }> => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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

    const { data: row, error } = await supabasePublic
      .from("volunteer_applications")
      .insert(insert)
      .select("id")
      .single();

    if (error || !row) {
      console.error("Erro ao salvar voluntário:", error);
      throw new Error("Não foi possível enviar sua inscrição. Tente novamente.");
    }

    return { ok: true, id: row.id };
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

    const { error } = await context.supabase
      .from("volunteer_applications")
      .update({ status: data.status, admin_notes: data.admin_notes ?? null })
      .eq("id", data.id);

    if (error) {
      console.error("Erro ao atualizar status:", error);
      throw new Error("Não foi possível atualizar a inscrição.");
    }

    return { ok: true };
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
