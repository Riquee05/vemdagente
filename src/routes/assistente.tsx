import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { PointsMap } from "@/components/map/points-map";
import { PointCard } from "@/components/points/point-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant, type AssistantAnswer, type AssistantPoint } from "@/lib/assistant.functions";
import { getBrowserLocation } from "@/lib/geocode";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente inteligente de doações | Vem da Gente" },
      {
        name: "description",
        content:
          "Pergunte em português: onde posso doar roupas infantis? O assistente do Vem da Gente indica pontos reais e verificados perto de você.",
      },
      { property: "og:title", content: "Assistente inteligente de doações | Vem da Gente" },
      {
        property: "og:description",
        content: "Pergunte em linguagem natural e receba pontos de doação reais perto de você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistentePage,
});

const SUGGESTIONS = [
  "Onde posso doar roupas infantis em São Paulo?",
  "Preciso de cesta básica perto de Belo Horizonte",
  "Quero doar alimentos no Recife, qual ONG recebe?",
  "Tem albergue aberto no centro do Rio de Janeiro?",
];

type Turn = { role: "user" | "assistant"; content: string };

function AssistentePage() {
  const ask = useServerFn(askAssistant);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const mutation = useMutation({
    mutationFn: async (message: string) =>
      ask({
        data: {
          message,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          history: turns.slice(-6),
        },
      }),
    onSuccess: (result) => {
      setAnswer(result);
      setTurns((prev) => [...prev, { role: "assistant", content: result.reply }]);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function send(message: string) {
    const text = message.trim();
    if (text.length < 3 || mutation.isPending) return;
    setTurns((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    mutation.mutate(text);
  }

  async function useMyLocation() {
    try {
      const position = await getBrowserLocation();
      setCoords(position);
      toast.success("Localização ativada — vou considerar o que está perto de você.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const points: AssistantPoint[] = answer?.points ?? [];
  const center: [number, number] = points[0]
    ? [points[0].lat, points[0].lng]
    : answer?.location
      ? [answer.location.lat, answer.location.lng]
      : [-14.235, -51.925];

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Assistente inteligente
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl">
          Pergunte do seu jeito.{" "}
          <span className="marker-underline">A gente encontra o ponto certo.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Escreva em português como você falaria com alguém: o que quer doar ou precisa receber e
          onde você está. Respondemos só com pontos reais já aprovados pela curadoria. Sem login.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="card-ink bg-card p-5">
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={mutation.isPending}
                  className="rounded border-2 border-border bg-surface px-3 py-1.5 text-left text-xs text-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {turns.length === 0 ? (
                <p className="rounded border-2 border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
                  Exemplo: “tenho um sofá e roupas de bebê para doar em Curitiba”.
                </p>
              ) : null}

              {turns.map((turn, index) => (
                <div
                  key={`${turn.role}-${index}`}
                  className={
                    turn.role === "user"
                      ? "ml-auto max-w-[85%] rounded border-2 border-border bg-primary px-4 py-2 text-sm text-primary-foreground"
                      : "max-w-[92%] rounded border-2 border-border bg-surface px-4 py-3 text-sm whitespace-pre-line"
                  }
                >
                  {turn.content}
                </div>
              ))}

              {mutation.isPending ? (
                <div className="max-w-[92%] rounded border-2 border-dashed border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
                  Procurando pontos verificados…
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            <form
              className="mt-5 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
            >
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Onde posso doar roupas de inverno em Porto Alegre?"
                rows={3}
                maxLength={600}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={mutation.isPending || input.trim().length < 3}>
                  {mutation.isPending ? "Consultando…" : "Perguntar"}
                </Button>
                <Button type="button" variant="outline" onClick={useMyLocation}>
                  {coords ? "Localização ativa" : "Usar minha localização"}
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            {answer?.location ? (
              <p className="text-sm text-muted-foreground">
                Buscando perto de <strong className="text-foreground">{answer.location.label}</strong>
                {answer.categoryLabel ? ` — ${answer.categoryLabel}` : ""}
              </p>
            ) : null}

            <PointsMap
              center={center}
              zoom={points.length ? 12 : 4}
              points={points.map((point) => ({
                id: point.id,
                name: point.name,
                lat: point.lat,
                lng: point.lng,
                subtitle: point.city,
              }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
              className="card-ink h-[320px] w-full overflow-hidden bg-surface"
            />

            {points.length ? (
              <div className="space-y-3">
                {points.map((point) => (
                  <PointCard
                    key={point.id}
                    point={{ ...point, distance_km: point.distance_km ?? null }}
                    active={selectedId === point.id}
                    onHighlight={setSelectedId}
                  />
                ))}
              </div>
            ) : (
              <div className="card-ink bg-card p-5 text-sm text-muted-foreground">
                Os pontos indicados na resposta aparecem aqui, com endereço, contato e distância.
                Você também pode explorar tudo em{" "}
                <Link to="/pontos" className="font-semibold text-foreground underline">
                  ver todos os pontos
                </Link>
                .
              </div>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
