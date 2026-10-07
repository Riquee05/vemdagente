import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PointsMap } from "@/components/map/points-map";
import { PointCard } from "@/components/points/point-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant, type AssistantAnswer } from "@/lib/assistant.functions";
import { getBrowserLocation } from "@/lib/geocode";
import { fetchActiveNeedsByPointIds, fetchCategories } from "@/lib/points";
import { GUIDED_PAGE_SIZE, type GuidedSearch } from "@/lib/guided-search";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Busca guiada de instituições | Vem da Gente" },
      {
        name: "description",
        content:
          "Encontre instituições publicadas em São Paulo por categoria, cidade, bairro ou proximidade.",
      },
    ],
  }),
  component: AssistentePage,
});

function AssistentePage() {
  const ask = useServerFn(askAssistant);
  const categories = useQuery({
    queryKey: ["item-categories"],
    queryFn: fetchCategories,
    staleTime: 300000,
  });
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [submitted, setSubmitted] = useState<GuidedSearch | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (filters: GuidedSearch) => ask({ data: filters }),
    onSuccess: (result, filters) => {
      setAnswer(result);
      setSubmitted(filters);
      setSelectedId(null);
    },
  });
  function search(page = 1) {
    setAnswer(null);
    mutation.mutate({
      categoryId,
      city: coords ? "" : city,
      neighborhood: coords ? "" : neighborhood,
      location: coords ? { ...coords, radiusKm } : null,
      page,
    });
  }
  async function useMyLocation() {
    setLocating(true);
    setLocationError("");
    try {
      setCoords(await getBrowserLocation());
      setAnswer(null);
    } catch (error) {
      setLocationError(
        error instanceof Error
          ? error.message
          : "Não foi possível obter sua localização. Use cidade e bairro.",
      );
    } finally {
      setLocating(false);
    }
  }
  function nextPage(page: number) {
    if (!submitted) return;
    setAnswer(null);
    mutation.mutate({ ...submitted, page });
  }
  const points = answer?.points ?? [];
  const pointIds = points.map((point) => point.id);
  const needs = useQuery({
    queryKey: ["point-needs", pointIds],
    queryFn: () => fetchActiveNeedsByPointIds(pointIds),
    enabled: pointIds.length > 0,
  });
  const center: [number, number] = points[0]
    ? [points[0].lat, points[0].lng]
    : submitted?.location
      ? [submitted.location.lat, submitted.location.lng]
      : [-23.55, -46.63];
  const selectClass =
    "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base";
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Assistente de busca
        </p>
        <h1 className="mt-3 text-4xl">Vamos encontrar uma instituição.</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Escolha a categoria e onde deseja buscar. Consultamos os locais publicados no estado de
          São Paulo. Confirme diretamente com a instituição antes de ir. Sem login.
        </p>
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="card-ink self-start bg-card p-5">
            <h2 className="text-xl">Como podemos ajudar?</h2>
            <AccessibleForm
              className="mt-5 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                search();
              }}
            >
              <div>
                <label htmlFor="guided-category" className="block font-semibold">
                  1. Tipo de doação ou apoio
                </label>
                <select
                  id="guided-category"
                  className={selectClass}
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={categories.isPending || categories.isError}
                >
                  <option value="">Todas as categorias</option>
                  {categories.data?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {categories.isPending ? <p role="status">Carregando categorias…</p> : null}
                {categories.isError ? (
                  <div role="alert">
                    <p>
                      Não foi possível carregar as categorias. Você ainda pode buscar todos os
                      locais.
                    </p>
                    <Button type="button" variant="outline" onClick={() => categories.refetch()}>
                      Tentar carregar categorias
                    </Button>
                  </div>
                ) : null}
              </div>
              <fieldset className="space-y-3">
                <legend className="font-semibold">2. Onde buscar?</legend>
                <Button
                  type="button"
                  variant="outline"
                  onClick={useMyLocation}
                  disabled={locating || mutation.isPending}
                >
                  {locating ? "Obtendo localização…" : "Usar minha localização"}
                </Button>
                {locationError ? (
                  <p role="alert" className="text-destructive">
                    {locationError}
                  </p>
                ) : null}
                {coords ? (
                  <div className="space-y-3">
                    <p role="status">Busca pela sua localização atual.</p>
                    <label htmlFor="guided-radius" className="block">
                      Distância máxima
                    </label>
                    <select
                      id="guided-radius"
                      className={selectClass}
                      value={radiusKm}
                      onChange={(event) => setRadiusKm(Number(event.target.value))}
                    >
                      {[5, 15, 30, 60].map((radius) => (
                        <option key={radius} value={radius}>
                          {radius} km
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCoords(null);
                        setAnswer(null);
                      }}
                    >
                      Buscar por cidade e bairro
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="guided-city" className="block">
                        Cidade (opcional)
                      </label>
                      <Input
                        id="guided-city"
                        value={city}
                        maxLength={100}
                        onChange={(event) => setCity(event.target.value)}
                        placeholder="Ex.: São Paulo"
                      />
                    </div>
                    <div>
                      <label htmlFor="guided-neighborhood" className="block">
                        Bairro (opcional)
                      </label>
                      <Input
                        id="guided-neighborhood"
                        value={neighborhood}
                        maxLength={100}
                        onChange={(event) => setNeighborhood(event.target.value)}
                        placeholder="Ex.: Interlagos"
                        aria-describedby="guided-neighborhood-help"
                      />
                      <p
                        id="guided-neighborhood-help"
                        className="mt-1 text-sm text-muted-foreground"
                      >
                        O bairro é procurado no endereço cadastrado.
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sem cidade e bairro, buscamos em todo o estado de São Paulo.
                    </p>
                  </>
                )}
              </fieldset>
              <Button type="submit" disabled={mutation.isPending || locating}>
                {mutation.isPending ? "Buscando…" : "Encontrar instituições"}
              </Button>
            </AccessibleForm>
          </div>
          <div className="space-y-4" aria-busy={mutation.isPending}>
            {mutation.isPending ? <p role="status">Consultando instituições cadastradas…</p> : null}
            {mutation.isError ? (
              <div role="alert" className="card-ink bg-card p-5">
                <p>{mutation.error.message}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => mutation.mutate(mutation.variables!)}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : null}
            {answer ? (
              <div role="status" className="card-ink bg-surface p-5">
                <p>{answer.reply}</p>
              </div>
            ) : !mutation.isPending && !mutation.isError ? (
              <p>
                Preencha os filtros e toque em “Encontrar instituições”. Você também pode{" "}
                <Link to="/pontos" className="underline">
                  ver todos os pontos
                </Link>
                .
              </p>
            ) : null}
            {answer && submitted ? (
              <p className="text-sm text-muted-foreground">
                Busca:{" "}
                {submitted.location
                  ? `até ${submitted.location.radiusKm} km da sua localização`
                  : [submitted.city || "São Paulo (estado)", submitted.neighborhood]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                ·{" "}
                {categories.data?.find((category) => category.id === submitted.categoryId)?.label ??
                  "Todas as categorias"}
              </p>
            ) : null}
            {points.length ? (
              <>
                <a href="#guided-results" className="inline-block underline">
                  Ir para a lista de instituições
                </a>
                <PointsMap
                  center={center}
                  zoom={12}
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
                <section
                  id="guided-results"
                  tabIndex={-1}
                  aria-label="Instituições encontradas"
                  className="space-y-3"
                >
                  {points.map((point) => (
                    <PointCard
                      key={point.id}
                      point={point}
                      needs={(needs.data ?? []).filter((need) => need.point_id === point.id)}
                      active={selectedId === point.id}
                      onHighlight={setSelectedId}
                    />
                  ))}
                </section>
              </>
            ) : null}
            {answer && answer.total > GUIDED_PAGE_SIZE ? (
              <nav
                aria-label="Páginas das instituições"
                className="flex flex-wrap items-center gap-3"
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending || answer.page <= 1}
                  onClick={() => nextPage(answer.page - 1)}
                >
                  Anterior
                </Button>
                <span>
                  Página {answer.page} de {Math.ceil(answer.total / GUIDED_PAGE_SIZE)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending || answer.page * GUIDED_PAGE_SIZE >= answer.total}
                  onClick={() => nextPage(answer.page + 1)}
                >
                  Próxima
                </Button>
              </nav>
            ) : null}
            {needs.isError ? (
              <div role="alert">
                <p>
                  Não foi possível consultar as necessidades atuais. Os locais encontrados continuam
                  disponíveis.
                </p>
                <Button variant="outline" onClick={() => needs.refetch()}>
                  Recarregar necessidades
                </Button>
              </div>
            ) : null}
            {answer?.limited ? (
              <p className="text-sm text-muted-foreground">
                A busca por proximidade mostra até 60 locais. Refine a categoria ou diminua o raio
                para explorar melhor.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
