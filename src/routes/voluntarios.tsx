import { createFileRoute } from "@tanstack/react-router";
import { Check, HeartHandshake, Loader2 } from "lucide-react";
import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { areaLabels, areaOptions, submitVolunteerApplication } from "@/lib/volunteers.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/voluntarios")({
  head: () => ({
    meta: [
      { title: "Seja voluntário no Vem da Gente" },
      {
        name: "description",
        content:
          "Ajude o Vem da Gente a verificar pontos, curar conteúdo, divulgar a plataforma e muito mais. Inscreva-se como voluntário.",
      },
      { property: "og:title", content: "Seja voluntário no Vem da Gente" },
      {
        property: "og:description",
        content:
          "Ajude o Vem da Gente a verificar pontos, curar conteúdo, divulgar a plataforma e muito mais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoluntariosPage,
});

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

function VoluntariosPage() {
  const submit = useServerFn(submitVolunteerApplication);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selecaoAreas, setSelecaoAreas] = useState<Set<string>>(new Set());

  const toggleArea = (area: string) => {
    setSelecaoAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    if (selecaoAreas.size === 0) {
      setErro("Selecione pelo menos uma área de interesse.");
      setLoading(false);
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await submit({
        data: {
          full_name: String(formData.get("full_name") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          city: String(formData.get("city") ?? ""),
          state: String(formData.get("state") ?? ""),
          areas: Array.from(selecaoAreas) as typeof areaOptions[number][],
          availability: String(formData.get("availability") ?? ""),
          experience: String(formData.get("experience") ?? ""),
          motivation: String(formData.get("motivation") ?? ""),
          heard_from: String(formData.get("heard_from") ?? ""),
        },
      });
      setEnviado(true);
      form.reset();
      setSelecaoAreas(new Set());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar inscrição.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <section className="bg-brand-veil border-b-2 border-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:py-28">
          <p className="inline-block border-2 border-foreground bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
            Faça parte
          </p>
          <h1 className="mt-7 max-w-3xl text-5xl leading-[0.92] md:text-7xl">
            Seja <span className="text-primary">voluntário</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed md:text-xl">
            O Vem da Gente é feito por pessoas. Precisamos de ajuda para verificar pontos, curar
            conteúdo, divulgar a plataforma e apoiar quem chega por aqui.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-20">
        {enviado ? (
          <div className="card-ink -rotate-1 bg-card p-10 text-center">
            <span className="mx-auto flex size-14 -rotate-3 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground">
              <Check className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-6 text-3xl">Inscrição enviada!</h2>
            <p className="mt-4 text-muted-foreground">
              Obrigado por querer fazer parte. Vamos analisar seu perfil e entrar em contato por
              e-mail em breve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-ink -rotate-1 bg-card p-8 md:p-10">
            <div className="flex items-center gap-3">
              <span className="flex size-10 -rotate-3 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground">
                <HeartHandshake className="size-5" aria-hidden="true" />
              </span>
              <h2 className="text-3xl">Formulário de voluntariado</h2>
            </div>

            <p className="mt-5 text-muted-foreground">
              Conte um pouco sobre você. Os campos com * são obrigatórios.
            </p>

            <div className="mt-8 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome completo *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    required
                    maxLength={120}
                    placeholder="Seu nome"
                    className="border-2 border-foreground bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={255}
                    placeholder="seu@email.com"
                    className="border-2 border-foreground bg-background"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="phone">WhatsApp / telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    maxLength={40}
                    placeholder="(00) 00000-0000"
                    className="border-2 border-foreground bg-background"
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    name="city"
                    maxLength={80}
                    placeholder="Sua cidade"
                    className="border-2 border-foreground bg-background"
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="state">Estado</Label>
                  <select
                    id="state"
                    name="state"
                    className="h-10 w-full border-2 border-foreground bg-background px-3 text-sm"
                  >
                    <option value="">Selecione</option>
                    {estados.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Áreas de interesse *</Label>
                <div className="flex flex-wrap gap-2">
                  {areaOptions.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      className={`rounded-none border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                        selecaoAreas.has(area)
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-transparent text-muted-foreground hover:border-foreground"
                      }`}
                    >
                      {areaLabels[area]}
                    </button>
                  ))}
                </div>
                {selecaoAreas.size === 0 && (
                  <p className="text-xs text-muted-foreground">Selecione pelo menos uma área.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability">Disponibilidade</Label>
                <Textarea
                  id="availability"
                  name="availability"
                  maxLength={500}
                  rows={3}
                  placeholder="Quantas horas por semana? Quais dias da semana?"
                  className="border-2 border-foreground bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Experiência breve</Label>
                <Textarea
                  id="experience"
                  name="experience"
                  maxLength={1000}
                  rows={3}
                  placeholder="Já trabalhou com ONGs, comunidades, design, tecnologia...?"
                  className="border-2 border-foreground bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation">Por que quer ajudar? *</Label>
                <Textarea
                  id="motivation"
                  name="motivation"
                  required
                  maxLength={1000}
                  rows={3}
                  placeholder="Conte o que te move a fazer parte do Vem da Gente"
                  className="border-2 border-foreground bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heard_from">Como conheceu o Vem da Gente?</Label>
                <Input
                  id="heard_from"
                  name="heard_from"
                  maxLength={255}
                  placeholder="Indicação, rede social, busca..."
                  className="border-2 border-foreground bg-background"
                />
              </div>
            </div>

            {erro && (
              <div className="mt-6 border-2 border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                {erro}
              </div>
            )}

            <div className="mt-8">
              <Button
                type="submit"
                disabled={loading}
                className="card-ink-primary -rotate-1 font-display uppercase transition-transform hover:rotate-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar inscrição"
                )}
              </Button>
            </div>
          </form>
        )}
      </section>
    </PageShell>
  );
}
