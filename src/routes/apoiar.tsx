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
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { MoneyNotice } from "@/components/money-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/apoiar")({
  head: () => ({
    meta: [
      { title: "Apoiar o Vem da Gente — espalhe essa ideia" },
      {
        name: "description",
        content:
          "O Vem da Gente se mantém com a força da comunidade. Por enquanto, a melhor forma de apoiar é compartilhar e indicar pontos de coleta.",
      },
      { property: "og:title", content: "Apoiar o Vem da Gente — espalhe essa ideia" },
      {
        property: "og:description",
        content:
          "O Vem da Gente se mantém com a força da comunidade. Por enquanto, a melhor forma de apoiar é compartilhar e indicar pontos de coleta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApoiarPage,
});

function usePublicUrl() {
  const [url, setUrl] = useState("https://vemdagente.org");
  useEffect(() => {
    setUrl(window.location.origin);
  }, []);
  return url;
}

type Mensagem = {
  id: "geral" | "doador" | "quem-precisa";
  label: string;
  texto: string;
};

function useMensagens(siteUrl: string): [Mensagem, Mensagem, Mensagem] {
  return [
    {
      id: "geral",
      label: "Geral",
      texto: `Conheci o Vem da Gente: uma iniciativa independente que reúne instituições, pontos de coleta e redes de apoio no estado de São Paulo. Consulte os locais e confirme diretamente como ajudar: ${siteUrl}`,
    },
    {
      id: "doador",
      label: "Para doadores",
      texto: `Quer doar roupas, alimentos ou outros itens? O Vem da Gente reúne locais publicados no estado de São Paulo. Consulte as informações e confirme diretamente antes de ir: ${siteUrl}`,
    },
    {
      id: "quem-precisa",
      label: "Para quem precisa",
      texto: `Se você procura apoio no estado de São Paulo, o Vem da Gente reúne instituições e redes cadastradas. Consulte por município ou categoria e confirme diretamente: ${siteUrl}`,
    },
  ];
}

const shareButtons = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "bg-[#25D366]",
    makeUrl: (text: string, _siteUrl: string) =>
      `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "bg-[#1877F3]",
    makeUrl: (text: string, siteUrl: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}&quote=${encodeURIComponent(text)}`,
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icon: Twitter,
    color: "bg-foreground",
    makeUrl: (text: string, _siteUrl: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "bg-[#0A66C2]",
    makeUrl: (_text: string, siteUrl: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`,
  },
  {
    id: "email",
    label: "E-mail",
    icon: Mail,
    color: "bg-accent",
    makeUrl: (text: string, _siteUrl: string) =>
      `mailto:?subject=${encodeURIComponent("Conheça o Vem da Gente")}&body=${encodeURIComponent(text)}`,
  },
];

type MensagemId = ReturnType<typeof useMensagens>[number]["id"];

function ApoiarPage() {
  const siteUrl = usePublicUrl();
  const mensagens = useMensagens(siteUrl);
  const [copiado, setCopiado] = useState(false);
  const [mensagemAtiva, setMensagemAtiva] = useState<MensagemId>(mensagens[0].id);
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
          title: "Vem da Gente",
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
            Por enquanto o Vem da Gente não recebe doações em dinheiro. A melhor forma de apoiar é
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

              {typeof navigator.share === "function" && (
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
                    href={btn.makeUrl(textoAtivo, siteUrl)}
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
                Conhece uma instituição, serviço ou ponto de coleta no estado de São Paulo que deveria
                aparecer no mapa? Envie a indicação para análise antes da publicação.
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
          </div>
        </div>
        <MoneyNotice className="mt-10" />
      </section>
    </PageShell>
  );
}
