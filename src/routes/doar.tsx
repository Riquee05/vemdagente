import { createFileRoute, Link } from "@tanstack/react-router";

import { PageShell } from "@/components/layout/page-shell";
import { MoneyNotice } from "@/components/money-notice";
import { PointSearch } from "@/components/points/point-search";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/doar")({
  head: () => ({
    meta: [
      { title: "Quero doar — encontre pontos de coleta | Vem da Gente" },
      {
        name: "description",
        content:
          "Consulte locais publicados no estado de São Paulo e confirme diretamente endereço, horário e recebimento antes de doar.",
      },
      { property: "og:title", content: "Quero doar — encontre pontos de coleta | Vem da Gente" },
      {
        property: "og:description",
        content: "Locais de doação e apoio publicados no estado de São Paulo.",
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
        <h1 className="mt-3 text-4xl font-semibold">Encontre locais para doar em São Paulo</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Escolha o que você tem para doar e onde está no estado de São Paulo. Consulte endereço,
          contato e informações cadastradas; confirme diretamente com o local antes de ir. Buscar não exige conta.
        </p>

        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Você diz o que tem",
              text: "Escolha a categoria — roupas, alimentos, móveis — e, se quiser, a causa que quer apoiar.",
            },
            {
              step: "02",
              title: "Consulte os locais publicados",
              text: "Pontos, instituições e redes de apoio reunidos a partir de dados públicos e indicações da comunidade.",
            },
            {
              step: "03",
              title: "Confirme antes de ir",
              text: "Use o contato informado para confirmar itens, horários e forma de recebimento. O Vem da Gente não realiza entregas.",
            },
          ].map((item, index) => (
            <li
              key={item.step}
              className={`card-ink p-5 ${index === 1 ? "sm:translate-y-3" : ""}`}
            >
              <span className="font-display text-2xl text-accent">{item.step}</span>
              <h2 className="mt-2 font-display text-base leading-tight">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </li>
          ))}
        </ol>

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
