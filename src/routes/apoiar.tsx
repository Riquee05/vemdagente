import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Copy,
  Check,
  MessageCircle,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Share2,
  MapPin,
  HeartHandshake,
} from "lucide-react";
import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/apoiar")({
  head: () => ({
    meta: [
      { title: "Apoiar o DoaAqui — espalhe essa ideia" },
      {
        name: "description",
        content:
          "O DoaAqui se mantém com a força da comunidade. Por enquanto, a melhor forma de apoiar é compartilhar e indicar pontos de coleta.",
      },
      { property: "og:title", content: "Apoiar o DoaAqui — espalhe essa ideia" },
      {
        property: "og:description",
        content:
          "O DoaAqui se mantém com a força da comunidade. Por enquanto, a melhor forma de apoiar é compartilhar e indicar pontos de coleta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApoiarPage,
});

const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://doaaqui.org";

const mensagens = [
  {
    id: "geral",
    label: "Geral",
    texto: `Conheci o DoaAqui: uma plataforma que conecta doadores a pontos de coleta, ONGs e redes de apoio reais no Brasil. Quem precisa acha ajuda perto de casa e quem doa sabe onde entregar. Acesse: ${siteUrl}`,
  },
  {
    id: "doador",
    label: "Para doadores",
    texto: `Quer doar roupas, alimentos ou apoio e não sabe onde entregar? O DoaAqui mostra pontos verificados perto de você e o que cada um precisa agora. ${siteUrl}`,
  },
  {
    id: "quem-precisa",
    label: "Para quem precisa",
    texto: `Se você ou alguém perto precisa de ajuda, o DoaAqui lista pontos de coleta, ONGs e redes de apoio verificadas no Brasil. Busque por cidade ou categoria: ${siteUrl}`,
  },
] as const;

const shareButtons = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "bg-[#25D366]",
    makeUrl: (text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "bg-[#1877F3]",
    makeUrl: (text: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}&quote=${encodeURIComponent(text)}`,
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icon: Twitter,
    color: "bg-foreground",
    makeUrl: (text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "bg-[#0A66C2]",
    makeUrl: () =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`,
  },
  {
    id: "email",
    label: "E-mail",
    icon: Mail,
    color: "bg-accent",
    makeUrl: (text: string) =>
      `mailto:?subject=${encodeURIComponent("Conheça o DoaAqui")}&body=${encodeURIComponent(text)}`,
  },
];

function ApoiarPage() {
  const [copiado, setCopiado] = useState(false);
  const [mensagemAtiva, setMensagemAtiva] = useState(mensagens[0].id);
  const textoAtivo = mensagens.find((m) => m.id === mensagemAtiva)?.texto ?? mensagens[0].texto;

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback silencioso: em alguns navegadores antigos a API pode falhar.
    }
  };

  const compartilharNativo = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "DoaAqui",
          text: textoAtivo,
          url: siteUrl,
        });
        return;
      } catch {
        // Usuário cancelou ou não suporta: segue para os botões.
      }
    }
    await copiar(textoAtivo);
  };

  return (
    <PageShell>
      <section className="bg-brand-veil border-b-2 border-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:py-28">
          <p className="inline-block border-2 border-foreground bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
            Apoio da comunidade
          </p>
          <h1 className="mt-7 max-w-3xl text-5xl leading-[0.92] md:text-7xl">
            Espalhe essa <span className="text-primary">ideia</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed md:text-xl">
            Por enquanto o DoaAqui não recebe doações em dinheiro. A melhor forma de apoiar é
            contar para outras pessoas, indicar pontos de coleta e ajudar a manter o mapa vivo.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="card-ink -rotate-1 bg-card p-8 transition-transform hover:rotate-0 md:p-10">
            <div className="flex items-center gap-3">
              <span className="flex size-10 -rotate-3 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground">
                <Share2 className="size-5" aria-hidden="true" />
              </span>
              <h2 className="text-3xl">Compartilhar</h2>
            </div>

            <p className="mt-5 text-muted-foreground">
              Escolha uma mensagem pronta e envie para quem pode doar ou quem precisa de ajuda.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {mensagens.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMensagemAtiva(m.id)}
                  className={`rounded-none border-2 px-3 py-1 text-sm font-semibold uppercase tracking-wide transition-colors ${
                    mensagemAtiva === m.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-transparent text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="mt-6 border-2 border-foreground bg-surface p-4">
              <p className="min-h-[6rem] whitespace-pre-wrap leading-relaxed">{textoAtivo}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => copiar(textoAtivo)}
                className="card-ink-primary -rotate-1 font-display uppercase transition-transform hover:rotate-0"
              >
                {copiado ? (
                  <>
                    <Check className="mr-2 size-4" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" /> Copiar mensagem
                  </>
                )}
              </Button>

              {navigator.share && (
                <Button
                  variant="outline"
                  onClick={compartilharNativo}
                  className="card-ink rotate-1 font-display uppercase transition-transform hover:rotate-0"
                >
                  <Share2 className="mr-2 size-4" /> Compartilhar
                </Button>
              )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {shareButtons.map((btn) => {
                const Icon = btn.icon;
                return (
                  <a
                    key={btn.id}
                    href={btn.makeUrl(textoAtivo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center gap-2 border-2 border-foreground p-3 text-background transition-transform hover:-translate-y-1 ${btn.color}`}
                    aria-label={`Compartilhar no ${btn.label}`}
                  >
                    <Icon className="size-5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">{btn.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="space-y-8">
            <div className="card-ink rotate-1 bg-primary p-8 text-primary-foreground transition-transform hover:rotate-0 md:p-10">
              <div className="flex items-center gap-3">
                <span className="flex size-10 -rotate-3 items-center justify-center border-2 border-primary-foreground bg-primary-foreground text-primary">
                  <MapPin className="size-5" aria-hidden="true" />
                </span>
                <h2 className="text-3xl">Indicar um ponto</h2>
              </div>
              <p className="mt-5 leading-relaxed opacity-90">
                Conhece uma igreja, ONG, CRAS ou ponto de coleta que deveria aparecer no mapa?
                Cadastre gratuitamente. A equipe do DoaAqui cura cada indicação antes de publicar.
              </p>
              <div className="mt-8">
                <Button
                  asChild
                  variant="outline"
                  className="card-ink border-primary-foreground bg-primary-foreground font-display uppercase text-primary hover:bg-background hover:text-foreground"
                >
                  <Link to="/cadastrar-ponto">Cadastrar ponto</Link>
                </Button>
              </div>
            </div>

            <div className="card-ink -rotate-1 bg-secondary p-8 transition-transform hover:rotate-0 md:p-10">
              <div className="flex items-center gap-3">
                <span className="flex size-10 rotate-3 items-center justify-center border-2 border-foreground bg-background text-foreground">
                  <HeartHandshake className="size-5" aria-hidden="true" />
                </span>
                <h2 className="text-3xl">Ser voluntário</h2>
              </div>
              <p className="mt-5 text-muted-foreground">
                Quer ajudar a verificar pontos, revisar cadastros ou traduzir conteúdo? Deixe seu
                e-mail. Entraremos em contato quando a estrutura de voluntários estiver no ar.
              </p>
              <form
                className="mt-6 flex flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement)?.value;
                  if (email) {
                    window.location.href = `mailto:contato@doaaqui.org?subject=Quero ser voluntário no DoaAqui&body=E-mail: ${encodeURIComponent(email)}`;
                  }
                }}
              >
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="border-2 border-foreground bg-background"
                />
                <Button
                  type="submit"
                  className="card-ink-primary -rotate-1 font-display uppercase transition-transform hover:rotate-0"
                >
                  Quero ajudar
                </Button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                Enquanto não temos formulário próprio, usamos seu app de e-mail.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
