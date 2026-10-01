import { createFileRoute, Link } from "@tanstack/react-router";

import { PageShell } from "@/components/layout/page-shell";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade e proteção de dados | Vem da Gente" },
      {
        name: "description",
        content:
          "Como o Vem da Gente trata dados pessoais conforme a LGPD: quais dados coletamos, por quê, com quem compartilhamos e como exercer seus direitos.",
      },
      { property: "og:title", content: "Privacidade e proteção de dados | Vem da Gente" },
      {
        property: "og:description",
        content: "Nossa política de privacidade, base legal, medidas de proteção e direitos do titular.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacidadePage,
});

const sections = [
  {
    title: "Quais dados coletamos",
    body: "Nome, e-mail, cidade e, se você quiser, telefone. Em pedidos de ajuda, a categoria e a localização aproximada. Em candidaturas de voluntariado, os dados que você informa no formulário. Não pedimos documentos, dados bancários nem informações de saúde.",
  },
  {
    title: "Para que usamos",
    body: "Apenas para conectar quem doa a quem precisa: mostrar pontos próximos, encaminhar pedidos de ajuda e avaliar candidaturas de voluntariado. Não vendemos dados e não usamos para publicidade.",
  },
  {
    title: "Base legal (LGPD)",
    body: "Consentimento ao criar conta ou enviar um formulário, e execução do serviço que você solicitou. Você pode retirar o consentimento a qualquer momento excluindo sua conta.",
  },
  {
    title: "Quem pode ver seus dados",
    body: "O acesso é limitado a você e à equipe administrativa autorizada, conforme a finalidade de cada dado. Visitantes não recebem acesso direto aos dados pessoais da sua conta.",
  },
  {
    title: "Medidas de proteção",
    body: "Usamos autenticação, controle de acesso e registros de atividades administrativas. Nenhum sistema é totalmente invulnerável; revisamos as medidas e restringimos o acesso conforme a necessidade.",
  },
  {
    title: "Seus direitos",
    body: "Acessar, corrigir, portar e excluir seus dados. Em Minha conta você baixa uma cópia completa em JSON e pode excluir a conta com todos os dados pessoais associados.",
  },
  {
    title: "Retenção",
    body: "Mantemos os dados enquanto sua conta existir. Ao excluir a conta, o perfil e os pedidos de ajuda são apagados. Registros de auditoria guardam apenas identificadores técnicos, sem conteúdo pessoal.",
  },
];

function PrivacidadePage() {
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-3xl px-4 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">LGPD</p>
        <h1 className="mt-2 text-3xl font-semibold">Privacidade e proteção de dados</h1>
        <p className="mt-3 text-muted-foreground">
          Transparência é parte do cuidado. Aqui está, em português claro, o que fazemos com os
          dados de quem usa o Vem da Gente.
        </p>

        <div className="mt-10 space-y-6">
          {sections.map((s) => (
            <article key={s.title} className="card-ink bg-card p-5">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Para exercer seus direitos, acesse{" "}
          <Link to="/minha-conta" className="marker-underline font-semibold">
            Minha conta
          </Link>{" "}
          ou consulte o contato informado na página{" "}
          <Link to="/sobre" className="marker-underline font-semibold">
            Sobre o projeto
          </Link>
          .
        </p>
      </section>
    </PageShell>
  );
}
