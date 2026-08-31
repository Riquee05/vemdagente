import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/layout/page-shell";

export const Route = createFileRoute("/pontos")({
  head: () => ({
    meta: [
      { title: "Pontos de coleta e ONGs verificadas | DoaAqui" },
      {
        name: "description",
        content:
          "Lista de pontos de coleta e ONGs verificadas pelo DoaAqui, com o que cada um aceita e o que está precisando agora.",
      },
      { property: "og:title", content: "Pontos de coleta e ONGs verificadas | DoaAqui" },
      {
        property: "og:description",
        content: "Pontos curados, com endereço, horários e necessidades atuais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PontosPage,
});

function PontosPage() {
  return (
    <ComingSoon
      phase="Fase 2 — Construção"
      title="Pontos de coleta"
      description="A lista completa dos pontos verificados, com endereço, horários, o que aceitam e o que estão precisando."
    />
  );
}
