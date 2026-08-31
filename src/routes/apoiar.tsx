import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/layout/page-shell";

export const Route = createFileRoute("/apoiar")({
  head: () => ({
    meta: [
      { title: "Apoiar o DoaAqui com uma doação voluntária" },
      {
        name: "description",
        content:
          "O DoaAqui se mantém com doações voluntárias. Apoie o projeto para manter a plataforma no ar e gratuita para quem precisa.",
      },
      { property: "og:title", content: "Apoiar o DoaAqui com uma doação voluntária" },
      {
        property: "og:description",
        content: "Doações voluntárias mantêm a plataforma no ar e gratuita.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApoiarPage,
});

function ApoiarPage() {
  return (
    <ComingSoon
      phase="Fase 3 — Polimento e lançamento"
      title="Apoiar o DoaAqui"
      description="A página de doações voluntárias que sustenta o projeto. O DoaAqui não intermedia doações para ONGs — aqui é o apoio à própria plataforma."
    />
  );
}
