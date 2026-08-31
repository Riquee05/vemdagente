import { createFileRoute, Link } from "@tanstack/react-router";

import heroImage from "@/assets/hero-doaaqui.jpg";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DoaAqui — conecte doações a quem precisa de verdade" },
      {
        name: "description",
        content:
          "Encontre pontos de coleta e ONGs verificadas perto de você, veja o que cada um precisa agora e peça ajuda sem burocracia. Buscar não exige conta.",
      },
      { property: "og:title", content: "DoaAqui — conecte doações a quem precisa de verdade" },
      {
        property: "og:description",
        content:
          "Pontos de coleta verificados, necessidades reais e um assistente que responde em português.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const entradas = [
  {
    to: "/doar" as const,
    eyebrow: "Quero doar",
    title: "Encontrar onde doar",
    description:
      "Diga o que você tem e onde está. Mostramos pontos verificados por perto e o que cada um está precisando agora.",
    cta: "Buscar pontos",
  },
  {
    to: "/pedir-ajuda" as const,
    eyebrow: "Preciso de ajuda",
    title: "Receber apoio perto de mim",
    description:
      "Informe sua região e o tipo de ajuda. Você vê locais de apoio próximos e pode registrar um pedido.",
    cta: "Pedir ajuda",
  },
];

function Index() {
  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Doação sem intermediário
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              Conecte o que você tem a quem precisa de verdade.
            </h1>
            <p className="mt-5 text-base text-muted-foreground md:text-lg">
              O DoaAqui reúne pontos de coleta e ONGs verificadas, mostra o que cada um precisa
              agora e leva a doação direto a quem a recebe. Nada de taxa, nada de intermediação.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/doar">Quero doar</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pedir-ajuda">Preciso de ajuda</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Buscar pontos e conversar com o assistente não exige conta.
            </p>
          </div>

          <div className="relative">
            <img
              src={heroImage}
              alt="Voluntários organizando caixas de roupas e alimentos em um ponto de coleta comunitário"
              className="w-full rounded-2xl object-cover shadow-soft"
              loading="eager"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold">Por onde você quer começar?</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {entradas.map((item) => (
            <Card key={item.to} className="flex flex-col shadow-soft">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  {item.eyebrow}
                </p>
                <CardTitle className="mt-2 text-xl">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button asChild variant="secondary">
                  <Link to={item.to}>{item.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold">Como funciona</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-primary">1. Pontos verificados</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cada ponto de coleta e ONG passa por curadoria antes de aparecer na busca.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">2. Necessidades reais</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Os pontos informam o que precisam agora, então você doa o que faz diferença hoje.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">3. Assistente em português</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pergunte “onde doar roupas infantis?” e receba locais reais, ordenados por
                distância.
              </p>
            </div>
          </div>
          <div className="mt-10">
            <Button asChild variant="outline">
              <Link to="/assistente">Conversar com o assistente</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
