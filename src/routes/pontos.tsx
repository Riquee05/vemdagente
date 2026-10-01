import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

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
import { fetchCauses, fetchPointIdsByCause, fetchVerifiedPoints } from "@/lib/points";

export const Route = createFileRoute("/pontos")({
  head: () => ({
    meta: [
      { title: "Pontos e instituições | Vem da Gente" },
      {
        name: "description",
        content:
          "Mapa e lista de pontos e instituições reunidos pelo Vem da Gente, com o que cada um aceita e o que está precisando agora.",
      },
      { property: "og:title", content: "Pontos e instituições | Vem da Gente" },
      {
        property: "og:description",
        content: "Pontos curados, com endereço, horários e necessidades atuais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PontosLayout,
});

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253];

function PontosLayout() {
  const matches = useMatches();
  const isChild = matches.some((match) => match.routeId === "/pontos/$pointId");
  if (isChild) return <Outlet />;
  return <PontosPage />;
}

function PontosPage() {
  const [cityInput, setCityInput] = useState("");
  const [city, setCity] = useState("");
  const [causeId, setCauseId] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const points = useQuery({
    queryKey: ["verified-points", city],
    queryFn: () => fetchVerifiedPoints(city),
  });

  const causes = useQuery({ queryKey: ["causes"], queryFn: fetchCauses });

  const causePointIds = useQuery({
    queryKey: ["cause-point-ids", causeId],
    queryFn: () => fetchPointIdsByCause(causeId),
    enabled: causeId !== "all",
  });

  const allowedIds = causeId === "all" ? null : new Set(causePointIds.data ?? []);
  const list = (points.data ?? []).filter((point) => !allowedIds || allowedIds.has(point.id));
  const first = list[0];
  const center: [number, number] = first ? [first.lat, first.lng] : DEFAULT_CENTER;

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Pontos e instituições
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Pontos de coleta e ONGs</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Reunimos locais a partir de dados públicos e indicações da comunidade. Confira os detalhes e entre em contato com a instituição antes de levar sua doação. Filtre por cidade, por causa ou
          navegue pelo mapa.
        </p>

        <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setCity(cityInput);
            }}
          >
            <div className="flex-1">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                className="mt-2"
                placeholder="Ex.: Campinas"
                value={cityInput}
                onChange={(event) => setCityInput(event.target.value)}
              />
            </div>
            <Button type="submit">Filtrar</Button>
          </form>
          <div>
            <Label>Causa</Label>
            <Select value={causeId} onValueChange={setCauseId}>
              <SelectTrigger className="mt-2">
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


        <div className="mt-8">
          <PointsMap
            center={center}
            zoom={first ? 12 : 4}
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
            <p className="text-sm text-muted-foreground">Não foi possível carregar os pontos.</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum ponto encontrado {city ? `em “${city}”` : "ainda"}. Você pode{" "}
              <Link to="/cadastrar-ponto" className="underline">
                cadastrar um ponto
              </Link>
              .
            </p>
          ) : (
            list.map((point) => (
              <PointCard
                key={point.id}
                point={point}
                active={selectedId === point.id}
                onHighlight={setSelectedId}
              />
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}
