import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_points",
  title: "Buscar pontos próximos",
  description:
    "Busca pontos de coleta, ONGs e redes de apoio verificados perto de uma coordenada (latitude/longitude), com raio em km.",
  inputSchema: {
    lat: z.number().min(-90).max(90).describe("Latitude do ponto de partida."),
    lng: z.number().min(-180).max(180).describe("Longitude do ponto de partida."),
    radius_km: z.number().min(1).max(100).default(15).describe("Raio da busca em quilômetros."),
    limit: z.number().int().min(1).max(50).default(20).describe("Quantidade máxima de resultados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ lat, lng, radius_km, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("search_nearby_points", {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radius_km,
      p_limit: limit,
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const points = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(points) }],
      structuredContent: { count: points.length, points },
    };
  },
});
