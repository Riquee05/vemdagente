import { defineTool } from "@lovable.dev/mcp-js";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "my_points",
  title: "Meus pontos",
  description:
    "Lista os pontos que a pessoa logada enviou ou administra, com o status de curadoria de cada um.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const userId = ctx.getUserId();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("collection_points")
      .select("id, name, city, state, curation_status, is_active, created_at")
      .or(`submitted_by.eq.${userId},claimed_by.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const points = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(points) }],
      structuredContent: { count: points.length, points },
    };
  },
});
