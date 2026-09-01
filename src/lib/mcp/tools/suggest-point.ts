import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "suggest_point",
  title: "Sugerir um novo ponto",
  description:
    "Envia uma nova instituição ou ponto de coleta para a curadoria da plataforma. Fica pendente até ser aprovado e não aparece no mapa antes disso.",
  inputSchema: {
    name: z.string().trim().min(3).describe("Nome da instituição ou ponto."),
    city: z.string().trim().min(2).describe("Cidade."),
    lat: z.number().min(-90).max(90).describe("Latitude."),
    lng: z.number().min(-180).max(180).describe("Longitude."),
    state: z.string().trim().min(2).max(2).optional().describe("UF, ex.: SP."),
    address: z.string().trim().min(5).optional().describe("Endereço completo."),
    description: z.string().trim().min(10).optional().describe("O que o local faz e o que precisa."),
    phone: z.string().trim().optional().describe("Telefone de contato."),
    whatsapp: z.string().trim().optional().describe("WhatsApp de contato."),
    website: z.string().trim().url().optional().describe("Site ou rede social."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("collection_points")
      .insert({
        ...input,
        source: "user",
        curation_status: "pending",
        is_active: true,
        submitted_by: ctx.getUserId(),
      })
      .select("id, name, city, curation_status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        {
          type: "text",
          text: `Ponto enviado para curadoria: ${JSON.stringify(data)}`,
        },
      ],
      structuredContent: { point: data },
    };
  },
});
