import {
  createFileRoute,
  Link,
  Outlet,
  useMatches,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { PointsMap } from "@/components/map/points-map";
import { MoneyNotice } from "@/components/money-notice";
import { PointCard } from "@/components/points/point-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchActiveNeedsByPointIds, fetchCauses, fetchVerifiedPointsPage } from "@/lib/points";

export const Route = createFileRoute("/pontos")({
  validateSearch: (search: Record<string, unknown> & SearchSchemaInput) => ({
    cidade: typeof search["cidade"] === "string" ? search["cidade"].trim().slice(0, 120) : "",
    causa:
      typeof search["causa"] === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search["causa"])
        ? search["causa"]
        : "all",
    pagina:
      Number.isSafeInteger(Number(search["pagina"])) && Number(search["pagina"]) > 0
        ? Math.min(Number(search["pagina"]), 10000)
        : 1,
  }),
  head: () => ({
    meta: [
      { title: "Pontos e instituições | Vem da Gente" },
      {
        name: "description",
        content:
          "Mapa e lista de locais publicados no estado de São Paulo, com origem, contato e informações para confirmar antes de ir.",
      },
      { property: "og:title", content: "Pontos e instituições | Vem da Gente" },
      {
        property: "og:description",
        content:
          "Locais no estado de São Paulo com origem, grau de confirmação, endereço e horários informados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PontosLayout,
});

const DEFAULT_CENTER: [number, number] = [-22.5, -48.6];

function PontosLayout() {
  const matches = useMatches();
  const isChild = matches.some((match) => match.routeId === "/pontos/$pointId");
  if (isChild) return <Outlet />;
  return <PontosPage />;
}

function PontosPage() {
  const { cidade: city, causa: causeId, pagina: page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [cityInput, setCityInput] = useState(city);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    setCityInput(city);
    setSelectedId(null);
  }, [city, causeId, page]);
  const updateFilters = (cidade: string, causa: string, pagina = 1) =>
    void navigate({ search: { cidade, causa, pagina } });
  const points = useQuery({
    queryKey: ["verified-points", city, causeId, page],
    queryFn: ({ signal }) => fetchVerifiedPointsPage({ city, causeId, page, signal }),
  });
  const causes = useQuery({ queryKey: ["causes"], queryFn: fetchCauses });
  const list = points.data?.points ?? [];
  const pointIds = list.map((point) => point.id);
  const needs = useQuery({
    queryKey: ["point-needs", pointIds],
    queryFn: () => fetchActiveNeedsByPointIds(pointIds),
    enabled: pointIds.length > 0,
  });
  const total = points.data?.total ?? 0;
  useEffect(() => {
    if (!points.isSuccess) return;
    const lastPage = Math.max(1, Math.ceil(total / 30));
    if (page > lastPage)
      void navigate({ search: { cidade: city, causa: causeId, pagina: lastPage }, replace: true });
  }, [points.isSuccess, total, page, city, causeId, navigate]);
  const first = list[0];
  const center: [number, number] = first ? [first.lat, first.lng] : DEFAULT_CENTER;

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Pontos e instituições
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Pontos e instituições</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Reunimos locais no estado de São Paulo a partir de dados públicos e indicações da
          comunidade. Confira os detalhes e entre em contato antes de ir. Filtre por município, por
          causa ou navegue pelo mapa.
        </p>

        <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateFilters(cityInput, causeId);
            }}
          >
            <div className="flex-1">
              <Label htmlFor="cidade">Município em São Paulo</Label>
              <Input
                id="cidade"
                className="mt-2"
                placeholder="Ex.: Campinas"
                value={cityInput}
                onChange={(event) => setCityInput(event.target.value)}
              />
            </div>
            <Button type="submit">Filtrar</Button>
            {city || cityInput ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCityInput("");
                  updateFilters("", "all");
                }}
              >
                Limpar
              </Button>
            ) : null}
          </form>
          <div>
            <Label htmlFor="causa">Causa</Label>
            <Select value={causeId} onValueChange={(value) => updateFilters(city, value)}>
              <SelectTrigger id="causa" className="mt-2">
                <SelectValue placeholder="Todas as causas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as causas</SelectItem>
                {(causes.data ?? []).map((cause) => (
                  <SelectItem key={cause.id} value={cause.id}>
                    {cause.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {causes.isError && (
          <div role="alert" className="mt-4 text-sm">
            Não foi possível carregar as causas.{" "}
            <Button variant="outline" onClick={() => void causes.refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          O mapa mostra os locais desta página. Use a paginação para ver os demais.
        </p>
        <div className="mt-8">
          <PointsMap
            center={center}
            zoom={first ? 12 : 7}
            fitBounds
            selectedId={selectedId}
            onSelect={setSelectedId}
            points={list.map((point) => ({
              id: point.id,
              name: point.name,
              lat: point.lat,
              lng: point.lng,
              subtitle: point.address ?? point.city,
            }))}
          />
        </div>

        <MoneyNotice className="mt-8" />

        <div className="mt-8 space-y-3">
          {points.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando pontos…</p>
          ) : points.isError ? (
            <div role="alert">
              <p>Não foi possível carregar os pontos.</p>
              <Button className="mt-3" onClick={() => void points.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum ponto encontrado nesta página {city ? `em “${city}”` : "ainda"}. Você pode{" "}
              <Link to="/cadastrar-ponto" className="underline">
                cadastrar um ponto
              </Link>
              .{" "}
              <Button variant="outline" onClick={() => updateFilters("", "all")}>
                Ver todos os locais
              </Button>
            </p>
          ) : (
            list.map((point) => (
              <PointCard
                key={point.id}
                point={point}
                needs={(needs.data ?? []).filter((need) => need.point_id === point.id)}
                active={selectedId === point.id}
                onHighlight={setSelectedId}
              />
            ))
          )}
          {points.isSuccess && total > 0 ? (
            <nav
              aria-label="Paginação de locais"
              className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm"
            >
              <span>
                Mostrando {(page - 1) * 30 + (list.length ? 1 : 0)}–{(page - 1) * 30 + list.length}{" "}
                de {total} locais.
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => updateFilters(city, causeId, page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={page * 30 >= total}
                  onClick={() => updateFilters(city, causeId, page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </nav>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
