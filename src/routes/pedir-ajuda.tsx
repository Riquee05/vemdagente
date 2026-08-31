import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/layout/page-shell";

export const Route = createFileRoute("/pedir-ajuda")({
  head: () => ({
    meta: [
      { title: "Preciso de ajuda — encontre apoio perto de você | DoaAqui" },
      {
        name: "description",
        content:
          "Diga onde você está e que tipo de ajuda precisa: o DoaAqui mostra pontos de apoio próximos e registra seu pedido.",
      },
      { property: "og:title", content: "Preciso de ajuda — encontre apoio perto de você | DoaAqui" },
      {
        property: "og:description",
        content: "Pontos de apoio próximos e registro do seu pedido de ajuda, com ou sem conta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PedirAjudaPage,
});

function PedirAjudaPage() {
  return (
    <ComingSoon
      phase="Fase 2 — Construção"
      title="Preciso de ajuda"
      description="Aqui você vai informar sua localização e o tipo de ajuda, ver pontos de apoio próximos e registrar um pedido de ajuda — com ou sem conta."
    />
  );
}
