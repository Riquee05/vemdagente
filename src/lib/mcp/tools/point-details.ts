import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "point_details",
  title: "Detalhes de um ponto",
  description:
    "Traz os dados completos de um ponto: contato, causas atendidas, itens aceitos e necessidades ativas.",
  inputSchema: { point_id: z.string().uuid().describe("ID do ponto.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ point_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: point, error } = await supabase
      .from("collection_points")
      .select(
        "id, name, description, address, city, state, lat, lng, phone, whatsapp, website, opening_hours, donation_method, curation_status, is_active",
      )
      .eq("id", point_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!point)
      return { content: [{ type: "text", text: "Ponto não encontrado." }], isError: true };

    const [items, causes, needs] = await Promise.all([
      supabase
        .from("point_accepted_items")
        .select("category_id, item_categories(slug, label)")
        .eq("point_id", point_id),
      supabase
        .from("point_causes")
        .select("cause_id, causes(slug, label)")
        .eq("point_id", point_id),
      supabase.from("point_needs").select("*").eq("point_id", point_id),
    ]);

    const payload = {
      point,
      accepted_items: items.data ?? [],
      causes: causes.data ?? [],
      needs: needs.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
