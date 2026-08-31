import { createFileRoute, Link } from "@tanstack/react-router";

import { PageShell } from "@/components/layout/page-shell";
import { MoneyNotice } from "@/components/money-notice";
import { PointSearch } from "@/components/points/point-search";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/doar")({
  head: () => ({
    meta: [
      { title: "Quero doar — encontre pontos de coleta | DoaAqui" },
      {
        name: "description",
        content:
          "Informe sua localização e o que quer doar: o DoaAqui mostra no mapa os pontos de coleta e ONGs próximas que aceitam e precisam do item.",
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
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Quero doar</p>
        <h1 className="mt-3 text-4xl font-semibold">Encontre onde doar perto de você</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Escolha o que você tem para doar e onde está. Mostramos apenas pontos verificados, com
          endereço, contato e o que cada um está precisando agora. Buscar não exige conta.
        </p>

        <div className="mt-10">
          <PointSearch kindHint="donate" />
        </div>

        <div className="mt-12 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Conhece um ponto que não está aqui?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre o local com foto e localização. Nossa curadoria revisa antes de publicar.
          </p>
          <Button asChild className="mt-4">
            <Link to="/cadastrar-ponto">Cadastrar um ponto</Link>
          </Button>
        </div>
        <MoneyNotice className="mt-10" />
      </section>
    </PageShell>
  );
}
