import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { groupMapPoints, SATELLITE_URL, SATELLITE_ATTRIBUTION } from "@/lib/map-layers";

export type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string | null;
};
function popupContent(point: MapPoint) {
  const content = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = point.name;
  content.appendChild(name);
  if (point.subtitle) {
    const address = document.createElement("div");
    address.textContent = point.subtitle;
    content.appendChild(address);
  }
  return content;
}
function pinIcon(selected: boolean, count?: number) {
  return L.divIcon({
    className: "vdg-map-marker",
    html: count
      ? `<span class="vdg-map-cluster">${count}</span>`
      : `<span class="vdg-map-pin${selected ? " vdg-map-pin-selected" : ""}" aria-hidden="true"></span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}
export default function PointsMapImpl({
  center,
  zoom = 13,
  points,
  onSelect,
  onPick,
  selectedId,
  fitBounds = false,
}: {
  center: [number, number];
  zoom?: number;
  points: MapPoint[];
  onSelect?: (id: string) => void;
  onPick?: (lat: number, lng: number) => void;
  selectedId?: string | null;
  fitBounds?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const callbacksRef = useRef({ onSelect, onPick });
  callbacksRef.current = { onSelect, onPick };
  const initialRef = useRef({ center, zoom });
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const previousRef = useRef<{
    center: string;
    zoom: number;
    geography: string;
    fit: boolean;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(zoom);
  const [layer, setLayer] = useState<"satellite" | "streets">("satellite");
  const [tileError, setTileError] = useState(false);
  const [retry, setRetry] = useState(0);
  const geography = points
    .map((p) => `${p.id}:${p.lat}:${p.lng}`)
    .sort()
    .join("|");
  const markerKey = points
    .map((p) => `${p.id}:${p.lat}:${p.lng}:${p.name}:${p.subtitle ?? ""}`)
    .sort()
    .join("|");
  const lat = center[0],
    lng = center[1];

  useEffect(() => {
    if (!containerRef.current) return;
    const initial = initialRef.current;
    const map = L.map(containerRef.current, {
      center: initial.center,
      zoom: initial.zoom,
      minZoom: 3,
      maxZoom: 19,
      scrollWheelZoom: false,
    });
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    map.on("zoomend", () => setMapZoom(map.getZoom()));
    map.on("click", (event: L.LeafletMouseEvent) =>
      callbacksRef.current.onPick?.(event.latlng.lat, event.latlng.lng),
    );
    map.zoomControl.setPosition("topright");
    const controls =
      containerRef.current.querySelectorAll<HTMLAnchorElement>(".leaflet-control-zoom a");
    controls[0]?.setAttribute("aria-label", "Ampliar mapa");
    controls[1]?.setAttribute("aria-label", "Reduzir mapa");
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(containerRef.current);
    setReady(true);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      layerRef.current = null;
      previousRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setTileError(false);
    layerRef.current?.remove();
    const tiles = L.tileLayer(
      layer === "satellite" ? SATELLITE_URL : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          layer === "satellite"
            ? SATELLITE_ATTRIBUTION
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        maxNativeZoom: layer === "satellite" ? 14 : 19,
        maxZoom: 19,
        updateWhenIdle: true,
        keepBuffer: 1,
        noWrap: true,
      },
    );
    tiles.on("tileerror", () => setTileError(true));
    tiles.addTo(map);
    layerRef.current = tiles;
    return () => {
      tiles.off();
      tiles.remove();
    };
  }, [ready, layer, retry]);

  useEffect(() => {
    const map = mapRef.current,
      markers = markersRef.current;
    if (!map || !markers || !ready) return;
    markers.clearLayers();
    for (const group of groupMapPoints(pointsRef.current, mapZoom, selectedId)) {
      if (group.length > 1) {
        const bounds = L.latLngBounds(group.map((p) => [p.lat, p.lng] as [number, number]));
        L.marker(bounds.getCenter(), {
          icon: pinIcon(false, group.length),
          title: `${group.length} locais — ampliar para visualizar`,
          alt: `${group.length} locais`,
        })
          .on("click", () =>
            map.fitBounds(bounds, {
              padding: [32, 32],
              maxZoom: Math.min(19, Math.max(mapZoom + 2, 17)),
            }),
          )
          .addTo(markers);
      } else {
        const point = group[0]!;
        const marker = L.marker([point.lat, point.lng], {
          icon: pinIcon(point.id === selectedId),
          title: point.name,
          alt: point.name,
          zIndexOffset: point.id === selectedId ? 1000 : 0,
        })
          .bindPopup(popupContent(point))
          .on("click", () => callbacksRef.current.onSelect?.(point.id))
          .addTo(markers);
        if (point.id === selectedId) marker.openPopup();
      }
    }
  }, [ready, markerKey, mapZoom, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const previous = previousRef.current,
      centerKey = `${lat}:${lng}`;
    const valid = pointsRef.current.filter(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lng) <= 180,
    );
    if (
      fitBounds &&
      valid.length &&
      (!previous || previous.geography !== geography || !previous.fit)
    ) {
      if (valid.length === 1) map.setView([valid[0]!.lat, valid[0]!.lng], zoom);
      else
        map.fitBounds(L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number])), {
          padding: [32, 32],
          maxZoom: 16,
        });
    } else if (previous && (previous.center !== centerKey || previous.zoom !== zoom))
      map.setView([lat, lng], zoom);
    previousRef.current = { center: centerKey, zoom, geography, fit: fitBounds };
  }, [ready, lat, lng, zoom, geography, fitBounds]);

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className="flex flex-wrap items-center gap-2 border-b border-border bg-background p-2"
        role="group"
        aria-label="Tipo de mapa"
      >
        <button
          type="button"
          aria-pressed={layer === "satellite"}
          className="vdg-map-layer-button"
          onClick={() => setLayer("satellite")}
        >
          Satélite
        </button>
        <button
          type="button"
          aria-pressed={layer === "streets"}
          className="vdg-map-layer-button"
          onClick={() => setLayer("streets")}
        >
          Ruas
        </button>
        {layer === "satellite" && (
          <span className="text-xs text-muted-foreground">
            Imagens de 2025; detalhe limitado ao aproximar.
          </span>
        )}
      </div>
      {tileError && (
        <div role="alert" className="bg-background p-2 text-sm">
          Não foi possível carregar algumas imagens.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setRetry((value) => value + 1)}
          >
            Tentar novamente
          </button>
          {layer === "satellite" && (
            <>
              {" "}
              ou{" "}
              <button type="button" className="underline" onClick={() => setLayer("streets")}>
                ver mapa de ruas
              </button>
            </>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="vdg-leaflet-map min-h-0 flex-1"
        aria-label="Mapa de pontos e instituições"
      />
    </div>
  );
}
