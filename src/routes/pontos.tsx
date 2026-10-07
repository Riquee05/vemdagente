import { AccessibleForm } from "@/components/accessibility/accessible-form";
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
    bairro: typeof search["bairro"] === "string" ? search["bairro"].trim().slice(0, 100) : "",
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
  const { cidade: city, causa: causeId, pagina: page, bairro: neighborhood } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [cityInput, setCityInput] = useState(city);
  const [neighborhoodInput, setNeighborhoodInput] = useState(neighborhood);
  const [location, setLocation] = useState<
    { lat: number; lng: number; radiusKm: number } | undefined
  >();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    setCityInput(city);
    setNeighborhoodInput(neighborhood);
    setSelectedId(null);
  }, [city, causeId, page, neighborhood]);
  const updateFilters = (cidade: string, causa: string, pagina = 1, bairro = neighborhood) =>
    void navigate({ search: { cidade, causa, pagina, bairro } });
  const findNearby = () => {
    if (!navigator.geolocation) {
      setLocationError("Seu navegador não oferece localização. Use município e bairro.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          radiusKm: 15,
        });
        updateFilters("", causeId, 1, "");
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError(
          "Não foi possível obter sua localização. Permita o acesso no navegador ou busque por município e bairro.",
        );
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
    );
  };
  const points = useQuery({
    queryKey: ["verified-points", city, causeId, page, neighborhood, location],
    queryFn: ({ signal }) =>
      fetchVerifiedPointsPage({ city, causeId, page, signal, neighborhood, location }),
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
      void navigate({
        search: { cidade: city, causa: causeId, pagina: lastPage, bairro: neighborhood },
        replace: true,
      });
  }, [points.isSuccess, total, page, city, causeId, navigate, neighborhood]);
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
          <AccessibleForm
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateFilters(cityInput, causeId, 1, neighborhoodInput);
            }}
          >
            <div className="w-full min-w-0 space-y-2">
              <Label htmlFor="cidade">Município em São Paulo</Label>
              <Input
                id="cidade"
                className="mt-2"
                placeholder="Ex.: Campinas"
                value={cityInput}
                onChange={(event) => setCityInput(event.target.value)}
              />
              <Label htmlFor="bairro">Bairro ou trecho do endereço</Label>
              <Input
                id="bairro"
                placeholder="Ex.: Interlagos"
                value={neighborhoodInput}
                onChange={(event) => setNeighborhoodInput(event.target.value)}
              />
            </div>
            <Button type="submit">Filtrar</Button>
            {city || cityInput || neighborhood || neighborhoodInput || location ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCityInput("");
                  setNeighborhoodInput("");
                  setLocation(undefined);
                  updateFilters("", "all", 1, "");
                }}
              >
                Limpar
              </Button>
            ) : null}
          </AccessibleForm>
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

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={locating} onClick={findNearby}>
            {locating ? "Obtendo localização…" : "Perto de mim"}
          </Button>
          {location && (
            <>
              <Label htmlFor="raio">Raio</Label>
              <select
                id="raio"
                className="rounded-md border border-border bg-background p-2"
                value={location.radiusKm}
                onChange={(event) => {
                  setLocation({ ...location, radiusKm: Number(event.target.value) });
                  updateFilters(city, causeId);
                }}
              >
                {[5, 15, 30, 50].map((radius) => (
                  <option key={radius} value={radius}>
                    {radius} km
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                onClick={() => {
                  setLocation(undefined);
                  updateFilters(city, causeId);
                }}
              >
                Desativar proximidade
              </Button>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A localização só é solicitada ao tocar no botão e é usada para esta busca. O filtro de
          bairro busca no endereço cadastrado.
        </p>
        {locationError && (
          <p role="alert" className="mt-2 text-sm">
            {locationError}
          </p>
        )}
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
        <a href="#lista-de-pontos" className="mt-4 inline-block min-h-11 py-3 underline">
          Ir direto para a lista de instituições
        </a>
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

        <div
          id="lista-de-pontos"
          tabIndex={-1}
          aria-label="Lista de instituições e endereços"
          className="mt-8 space-y-3"
        >
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
              <Button
                variant="outline"
                onClick={() => {
                  setLocation(undefined);
                  updateFilters("", "all", 1, "");
                }}
              >
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
