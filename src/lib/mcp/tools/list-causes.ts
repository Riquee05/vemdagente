import { defineTool } from "@lovable.dev/mcp-js";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_causes",
  title: "Listar causas e categorias",
  description:
    "Lista as causas atendidas (crianças, idosos, animais, saúde, meio ambiente etc.) e as categorias de itens aceitos.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [causes, categories] = await Promise.all([
      supabase.from("causes").select("id, slug, label").order("label"),
      supabase.from("item_categories").select("id, slug, label, kind").order("label"),
    ]);
    if (causes.error) return { content: [{ type: "text", text: causes.error.message }], isError: true };
    if (categories.error) return { content: [{ type: "text", text: categories.error.message }], isError: true };

    const payload = { causes: causes.data ?? [], item_categories: categories.data ?? [] };
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});
