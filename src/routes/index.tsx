import { createFileRoute, Link } from "@tanstack/react-router";

import heroImage from "@/assets/hero-doaaqui.jpg";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vem da Gente — conecte doações a quem precisa de verdade" },
      {
        name: "description",
        content:
          "Encontre pontos de coleta e instituições cadastradas perto de você, veja o que cada um precisa agora e peça ajuda sem burocracia. Buscar não exige conta.",
      },
      { property: "og:title", content: "Vem da Gente — conecte doações a quem precisa de verdade" },
      {
        property: "og:description",
        content:
          "Pontos e instituições, necessidades reais e um assistente que responde em português.",
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
      "Diga o que você tem e onde está. Mostramos pontos e instituições por perto e o que cada um está precisando agora.",
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

const passos = [
  {
    numero: "01",
    titulo: "Veja o que cada ponto precisa",
    texto:
      "Roupas, alimentos, apoio. Cada ponto e ONG informa o que está faltando agora, então você doa o que faz diferença hoje.",
  },
  {
    numero: "02",
    titulo: "Ache o local mais perto",
    texto:
      "Use o mapa ou o assistente em português para encontrar pontos e instituições perto de você, ordenados por distância.",
  },
  {
    numero: "03",
    titulo: "Entregue direto a quem recebe",
    texto:
      "Sem taxa e sem intermediário: você leva a doação até o ponto e ela chega em quem realmente precisa.",
  },
];

function Index() {
  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-16 md:pt-16 md:pb-20">
          <div className="relative z-10">
            <p className="inline-block border-2 border-foreground bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
              Doação sem intermediário
            </p>
            <h1 className="mt-7 max-w-3xl text-5xl leading-[0.92] md:text-7xl">
              O que <span className="text-primary">sobra</span> em você,{" "}
              <span className="marker-underline">falta</span> em alguém.
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed md:text-xl">
              O Vem da Gente reúne pontos de coleta e instituições a partir de dados públicos do
              Google Maps, mostra o que cada um precisa agora e leva a doação direto a quem a recebe.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Button
                asChild
                size="lg"
                className="card-ink-primary -rotate-1 font-display uppercase transition-transform hover:rotate-0"
              >
                <Link to="/doar">Quero doar</Link>
              </Button>
              <Link
                to="/pedir-ajuda"
                className="border-b-2 border-primary pb-1 font-semibold transition-colors hover:text-primary"
              >
                Preciso de ajuda &rarr;
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Buscar pontos e conversar com o assistente não exige conta.
            </p>
          </div>

          <div className="pointer-events-none absolute top-10 right-4 hidden h-[420px] w-[46%] -rotate-3 bg-secondary lg:block" />
          <div className="absolute top-20 right-10 hidden w-[400px] -rotate-1 border-2 border-foreground bg-primary p-2 shadow-[14px_14px_0_0_var(--color-foreground)] lg:block">
            <img
              src={heroImage}
              alt="Voluntários organizando caixas de roupas e alimentos em um ponto de coleta comunitário"
              className="h-[440px] w-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      <section className="border-y-2 border-foreground bg-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 md:grid-cols-2">
          <div className="card-ink -rotate-1 bg-card p-10 transition-transform hover:rotate-0">
            <span className="font-display text-xs uppercase tracking-widest text-primary">
              Quero doar
            </span>
            <h2 className="mt-4 mb-6 text-3xl">Encontrar onde doar</h2>
            <p className="mb-8 text-lg leading-relaxed">
              Diga o que você tem e onde está. Mostramos pontos e instituições por perto e o que cada
              um está precisando agora.
            </p>
            <div className="mb-8 h-1 w-full bg-foreground" />
            <Link
              to="/doar"
              className="border-b-2 border-primary pb-1 font-semibold transition-colors hover:text-primary"
            >
              Ver mapa de pontos &rarr;
            </Link>
          </div>

          <div className="card-ink rotate-1 bg-primary p-10 text-primary-foreground transition-transform hover:rotate-0">
            <span className="font-display text-xs uppercase tracking-widest opacity-85">
              Preciso de ajuda
            </span>
            <h2 className="mt-4 mb-6 text-3xl">Receber apoio perto de mim</h2>
            <p className="mb-8 text-lg leading-relaxed">
              Informe sua região e o tipo de ajuda. Você vê locais de apoio próximos e pode
              registrar um pedido sem burocracia.
            </p>
            <div className="mb-8 h-1 w-full bg-primary-foreground" />
            <Link
              to="/pedir-ajuda"
              className="border-b-2 border-primary-foreground pb-1 font-semibold transition-opacity hover:opacity-80"
            >
              Registrar pedido &rarr;
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-24">
        <div className="text-center">
          <h2 className="relative inline-block text-4xl">
            Como funciona
            <span className="absolute -bottom-2 right-0 h-2 w-24 bg-primary" />
          </h2>
        </div>

        <div className="relative mt-20 space-y-20">
          <div className="absolute top-0 bottom-0 left-1/2 hidden -translate-x-1/2 border-l-2 border-dashed border-primary md:block" />

          {passos.map((passo, i) => (
            <div
              key={passo.numero}
              className={`relative flex flex-col items-center gap-10 md:flex-row ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className={`md:w-1/2 ${i % 2 === 1 ? "md:text-left" : "md:text-right"}`}>
                <div className="font-display text-7xl leading-none text-secondary">
                  {passo.numero}
                </div>
                <h3 className="mt-3 mb-4 text-2xl">{passo.titulo}</h3>
                <p className="text-lg leading-relaxed text-muted-foreground">{passo.texto}</p>
              </div>
              <div className="z-10 flex size-16 shrink-0 items-center justify-center rounded-full border-8 border-background bg-foreground">
                <div className="size-3 rounded-full bg-background" />
              </div>
              <div className="md:w-1/2" />
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="card-ink rotate-1 font-display uppercase transition-transform hover:rotate-0"
          >
            <Link to="/assistente">Conversar com o assistente</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}

