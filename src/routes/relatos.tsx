import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listPublishedTestimonials, submitTestimonial } from "@/lib/community.functions";
export const Route = createFileRoute("/relatos")({
  head: () => ({
    meta: [
      { title: "Histórias que aproximam | Vem da Gente" },
      {
        name: "description",
        content:
          "Experiências da comunidade com o Vem da Gente. Compartilhe a sua história para revisão e publicação.",
      },
    ],
  }),
  component: RelatosPage,
});
function RelatosPage() {
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState(5);
  const [story, setStory] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [sent, setSent] = useState(false);
  const stories = useQuery({
    queryKey: ["published-testimonials", page],
    queryFn: () => listPublishedTestimonials({ data: { page } }),
  });
  const submit = useMutation({
    mutationFn: () =>
      submitTestimonial({
        data: { display_name: name, city, rating, story, consent: true, website },
      }),
    onSuccess: () => {
      setSent(true);
      setName("");
      setCity("");
      setStory("");
      setConsent(false);
      toast.success("Relato enviado para revisão.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar."),
  });
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Nossa comunidade
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Histórias que aproximam</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Como o Vem da Gente fez parte da sua história? Conte sua experiência ao doar, receber
          apoio ou ajudar uma instituição. Os relatos são enviados pela comunidade e revisados antes
          da publicação.
        </p>
        <div className="mt-8 space-y-4">
          {stories.isPending && <p role="status">Carregando histórias…</p>}
          {stories.isError && (
            <div role="alert">
              Não foi possível carregar os relatos.{" "}
              <Button variant="outline" onClick={() => void stories.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}
          {stories.isSuccess && !stories.data.items.length && (
            <p className="rounded-xl border border-border p-6">
              Ainda não há relatos publicados. Compartilhe sua experiência para inspirar outras
              pessoas.
            </p>
          )}
          {stories.data?.items.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-card p-6">
              <p aria-label={`Avaliação: ${item.rating} de 5`} className="text-lg text-primary">
                {"★".repeat(item.rating)}
                {"☆".repeat(5 - item.rating)}
              </p>
              <blockquote className="mt-3 whitespace-pre-wrap break-words">{item.story}</blockquote>
              <p className="mt-4 font-semibold">
                {item.display_name}
                {item.city ? ` · ${item.city}` : ""}
              </p>
            </article>
          ))}
          {stories.data && stories.data.total > 12 && (
            <nav aria-label="Páginas de relatos" className="flex items-center gap-3">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span>Página {page}</span>
              <Button
                variant="outline"
                disabled={page * 12 >= stories.data.total}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </Button>
            </nav>
          )}
        </div>
        <div className="mt-12 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-2xl font-semibold">Compartilhe sua experiência</h2>
          {sent ? (
            <p role="status" className="mt-4">
              Obrigado! Seu relato está aguardando revisão. Ele só aparecerá nesta página se for
              aprovado pela administração.
            </p>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (consent) submit.mutate();
              }}
            >
              <p className="text-sm text-muted-foreground">
                Use seu primeiro nome ou um apelido. Não inclua telefone, endereço, dados de saúde
                nem informações pessoais de outras pessoas. Para pedir a retirada de um relato,
                escreva para{" "}
                <a className="underline" href="mailto:Vemdagente.contato@gmail.com">
                  Vemdagente.contato@gmail.com
                </a>
                .
              </p>
              <div>
                <Label htmlFor="relato-name">Nome público ou apelido</Label>
                <Input
                  id="relato-name"
                  required
                  minLength={2}
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="relato-city">Cidade (opcional)</Label>
                <Input
                  id="relato-city"
                  maxLength={80}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="relato-rating">Como foi sua experiência?</Label>
                <select
                  id="relato-rating"
                  className="mt-2 w-full rounded-md border border-border bg-background p-3"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} de 5 estrelas
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="relato-story">Seu relato</Label>
                <Textarea
                  id="relato-story"
                  required
                  minLength={30}
                  maxLength={2000}
                  rows={6}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {story.length}/2000 caracteres · mínimo de 30
                </p>
              </div>
              <div className="hidden" aria-hidden="true">
                <label htmlFor="relato-website">Website</label>
                <input
                  id="relato-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Autorizo a publicação deste relato, da avaliação e do nome público informado no
                  site após revisão. Li a{" "}
                  <Link to="/privacidade" className="underline">
                    política de privacidade
                  </Link>
                  .
                </span>
              </label>
              <Button
                type="submit"
                disabled={
                  submit.isPending || !consent || story.trim().length < 30 || name.trim().length < 2
                }
              >
                {submit.isPending ? "Enviando…" : "Enviar para revisão"}
              </Button>
            </form>
          )}
        </div>
      </section>
    </PageShell>
  );
}
