import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PointsMap } from "@/components/map/points-map";
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
import { geocodeAddress, getBrowserLocation } from "@/lib/geocode";
import {
  fetchActiveNeedsByPointIds,
  fetchCategories,
  fetchCauses,
  fetchPointIdsByCause,
  searchNearbyPoints,
} from "@/lib/points";

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];
const RADIUS_OPTIONS = [5, 10, 20, 50];

/** Busca de pontos por localização + categoria. Não exige login. */
export function PointSearch({ kindHint }: { kindHint: "donate" | "help" }) {
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [causeId, setCauseId] = useState<string>("all");
  const [radiusKm, setRadiusKm] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const categories = useQuery({ queryKey: ["item-categories"], queryFn: fetchCategories });
  const causes = useQuery({ queryKey: ["causes"], queryFn: fetchCauses });

  const causePointIds = useQuery({
    queryKey: ["cause-point-ids", causeId],
    queryFn: () => fetchPointIdsByCause(causeId),
    enabled: causeId !== "all",
  });

  // Sem localização informada, mostramos os pontos ao redor do centro padrão
  // para que o mapa nunca apareça vazio.
  const searchLat = coords?.lat ?? DEFAULT_CENTER[0];
  const searchLng = coords?.lng ?? DEFAULT_CENTER[1];
  const searchRadius = coords ? radiusKm : Math.max(radiusKm, 25);

  const results = useQuery({
    queryKey: ["nearby-points", searchLat, searchLng, categoryId, searchRadius],
    queryFn: () =>
      searchNearbyPoints({
        lat: searchLat,
        lng: searchLng,
        categoryId: categoryId === "all" ? null : categoryId,
        radiusKm: searchRadius,
      }),
  });



  async function useMyLocation() {
    setLocating(true);
    try {
      const position = await getBrowserLocation();
      setCoords(position);
      toast.success("Localização detectada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao localizar.");
    } finally {
      setLocating(false);
    }
  }

  async function searchByAddress(event: React.FormEvent) {
    event.preventDefault();
    setLocating(true);
    try {
      const found = await geocodeAddress(query);
      if (!found) {
        toast.error("Não encontramos esse endereço. Tente cidade e estado.");
        return;
      }
      setCoords({ lat: found.lat, lng: found.lng });
    } catch {
      toast.error("Busca de endereço indisponível agora.");
    } finally {
      setLocating(false);
    }
  }

  const allowedIds = causeId === "all" ? null : new Set(causePointIds.data ?? []);
  const points = (results.data ?? []).filter((point) => !allowedIds || allowedIds.has(point.id));
  const center: [number, number] = coords ? [coords.lat, coords.lng] : DEFAULT_CENTER;

  const activeNeeds = useQuery({
    queryKey: ["active-needs", points.map((p) => p.id).join(",")],
    queryFn: () => fetchActiveNeedsByPointIds(points.map((p) => p.id)),
    enabled: points.length > 0,
  });

  const needsByPoint = new Map<string, { urgency: string; category_label: string; note: string | null }[]>();
  for (const need of activeNeeds.data ?? []) {
    const list = needsByPoint.get(need.point_id) ?? [];
    list.push(need);
    needsByPoint.set(need.point_id, list);
  }

  return (
    <div className="space-y-6">
      {/* z-10 garante que os filtros fiquem sempre acima do mapa */}
      <form onSubmit={searchByAddress} className="relative z-10 grid gap-4 md:grid-cols-[1.4fr_auto]">
        <div>
          <Label htmlFor="local">Onde você está</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="local"
              placeholder="Cidade, bairro ou endereço"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit" disabled={locating}>
              Buscar
            </Button>
          </div>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
            Usar minha localização
          </Button>
        </div>
      </form>

      <div className="relative z-10 grid gap-4 sm:grid-cols-3">
        <div>
          <Label>{kindHint === "donate" ? "O que você quer doar" : "Que ajuda você precisa"}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <div>
          <Label>Distância máxima</Label>
          <Select value={String(radiusKm)} onValueChange={(value) => setRadiusKm(Number(value))}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  até {option} km
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PointsMap
        center={center}
        zoom={coords ? 13 : 11}
        points={points.map((point) => ({
          id: point.id,
          name: point.name,
          lat: point.lat,
          lng: point.lng,
          subtitle: point.address ?? point.city,
        }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div className="space-y-3">
        {!coords ? (
          <p className="text-sm text-muted-foreground">
            Mostrando pontos verificados na região de São Paulo. Informe sua localização acima para
            ver os mais próximos de você.
          </p>
        ) : null}
        {results.isPending ? (
          <p className="text-sm text-muted-foreground">Buscando pontos…</p>
        ) : results.isError ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível buscar agora. Tente novamente.
          </p>
        ) : points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum ponto verificado nesse raio. Tente aumentar a distância ou trocar a categoria.
          </p>
        ) : (
          points.map((point) => (
            <PointCard
              key={point.id}
              point={point}
              active={selectedId === point.id}
              onHighlight={setSelectedId}
            />
          ))
        )}

      </div>
    </div>
  );
}
