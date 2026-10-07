import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_points",
  title: "Listar pontos por cidade ou nome",
  description:
    "Lista pontos e instituições ativos da plataforma, com filtro opcional por cidade e por parte do nome.",
  inputSchema: {
    city: z.string().trim().min(2).optional().describe("Cidade, ex.: São Paulo."),
    search: z.string().trim().min(2).optional().describe("Parte do nome da instituição."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(30)
      .describe("Quantidade máxima de resultados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("collection_points")
      .select(
        "id, name, description, address, city, state, phone, whatsapp, website, opening_hours",
      )
      .eq("is_active", true)
      .eq("curation_status", "verified")
      .order("name")
      .limit(limit);
    if (city) query = query.ilike("city", `%${city}%`);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const points = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(points) }],
      structuredContent: { count: points.length, points },
    };
  },
});
