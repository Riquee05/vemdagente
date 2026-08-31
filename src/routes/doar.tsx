import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/layout/page-shell";

export const Route = createFileRoute("/doar")({
  head: () => ({
    meta: [
      { title: "Quero doar — encontre pontos de coleta | DoaAqui" },
      {
        name: "description",
        content:
          "Informe sua localização e o que quer doar: o DoaAqui mostra pontos de coleta e ONGs próximas que aceitam e precisam do item.",
      },
      { property: "og:title", content: "Quero doar — encontre pontos de coleta | DoaAqui" },
      {
        property: "og:description",
        content: "Pontos de coleta e ONGs próximas que aceitam roupas, alimentos e dinheiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoarPage,
});

function DoarPage() {
  return (
    <ComingSoon
      phase="Fase 2 — Construção"
      title="Quero doar"
      description="Aqui você vai informar sua localização, escolher o que quer doar e ver a lista e o mapa dos pontos próximos que aceitam e estão precisando daquele item."
    />
  );
}
