import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listCausesTool from "./tools/list-causes";
import listPointsTool from "./tools/list-points";
import myPointsTool from "./tools/my-points";
import pointDetailsTool from "./tools/point-details";
import searchPointsTool from "./tools/search-points";
import suggestPointTool from "./tools/suggest-point";

// O issuer precisa ser o host direto do backend; o ref do projeto é inlinado no build.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "vem-da-gente",
  title: "Vem da Gente",
  version: "0.1.0",
  instructions:
    "Ferramentas do Vem da Gente, plataforma que conecta doadores a pontos de coleta, ONGs e redes de apoio no Brasil. Use `search_points` para achar locais perto de uma coordenada, `list_points` para buscar por cidade ou nome, `point_details` para contato, causas, itens aceitos e necessidades, `list_causes` para as causas e categorias disponíveis, `my_points` para os pontos da pessoa logada e `suggest_point` para enviar um novo local à curadoria. Nada aparece no mapa público antes da aprovação da curadoria. Doação em dinheiro é feita direto com a instituição: a plataforma não intermedia valores nem entregas.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchPointsTool, listPointsTool, pointDetailsTool, listCausesTool, myPointsTool, suggestPointTool],
});
