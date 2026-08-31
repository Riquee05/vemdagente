import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string | null;
};

function pinIcon(highlight: boolean) {
  return L.divIcon({
    className: "doaaqui-pin",
    html: `<span style="display:block;width:1.5rem;height:1.5rem;border-radius:9999px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);background:${
      highlight ? "hsl(32 88% 52%)" : "hsl(18 72% 48%)"
    }"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center[0], center[1], zoom]);
  return null;
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const key = points.map((point) => point.id).join(",");
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(
      L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number])),
      { padding: [32, 32] },
    );
  }, [map, key]);
  return null;
}

function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => onPick(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

export default function PointsMapImpl({
  center,
  zoom = 13,
  points,
  onSelect,
  onPick,
  selectedId,
}: {
  center: [number, number];
  zoom?: number;
  points: MapPoint[];
  onSelect?: (id: string) => void;
  onPick?: (lat: number, lng: number) => void;
  selectedId?: string | null;
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} zoom={zoom} />
      {onPick ? <ClickPicker onPick={onPick} /> : null}
      {points.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={pinIcon(selectedId === point.id)}
          {...(onSelect ? { eventHandlers: { click: () => onSelect(point.id) } } : {})}
        >
          <Popup>
            <strong>{point.name}</strong>
            {point.subtitle ? <div>{point.subtitle}</div> : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
