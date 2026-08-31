import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/layout/page-shell";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente inteligente de doações | DoaAqui" },
      {
        name: "description",
        content:
          "Pergunte em português: onde posso doar roupas infantis? O assistente do DoaAqui indica pontos reais e verificados perto de você.",
      },
      { property: "og:title", content: "Assistente inteligente de doações | DoaAqui" },
      {
        property: "og:description",
        content: "Pergunte em linguagem natural e receba pontos de doação reais perto de você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistentePage,
});

function AssistentePage() {
  return (
    <ComingSoon
      phase="Fase 2 — Construção"
      title="Assistente inteligente"
      description="Você vai poder perguntar em português, sem login: “onde posso doar roupas infantis em SP?” — e receber pontos reais, verificados, ordenados por distância."
    />
  );
}
