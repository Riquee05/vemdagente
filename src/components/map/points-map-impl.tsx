import { useEffect, useRef, useState } from "react";

export type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string | null;
};

type GoogleMapsApi = typeof google.maps;

let mapsPromise: Promise<GoogleMapsApi> | null = null;

function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Mapa indisponível."));
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  const browserKey = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
  const trackingId = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;
  if (!browserKey) return Promise.reject(new Error("Google Maps não está conectado."));

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = "initVemDaGenteMap";
    const cleanup = () => {
      delete window.initVemDaGenteMap;
    };

    window.initVemDaGenteMap = () => {
      cleanup();
      resolve(window.google.maps);
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: browserKey,
      loading: "async",
      callback: callbackName,
    });
    if (trackingId) params.set("channel", trackingId);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      mapsPromise = null;
      reject(new Error("Não foi possível carregar o Google Maps."));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}

function createInfoContent(point: MapPoint) {
  const content = document.createElement("div");
  content.className = "vemdagente-map-popup";

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
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let clickListener: google.maps.MapsEventListener | null = null;

    void loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const map = new maps.Map(containerRef.current, {
          center: { lat: center[0], lng: center[1] },
          zoom,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        mapRef.current = map;
        infoWindowRef.current = new maps.InfoWindow();
        setMapReady(true);
        if (onPick) {
          clickListener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
            const location = event.latLng;
            if (location) onPick(location.lat(), location.lng());
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Mapa indisponível.");
      });

    return () => {
      cancelled = true;
      clickListener?.remove();
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      infoWindowRef.current?.close();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    const bounds = new window.google.maps.LatLngBounds();

    markersRef.current = points.map((point) => {
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: point.lat, lng: point.lng },
        title: point.name,
        zIndex: selectedId === point.id ? 2 : 1,
        animation: selectedId === point.id ? window.google.maps.Animation.BOUNCE : undefined,
      });
      marker.addListener("click", () => {
        onSelect?.(point.id);
        const infoWindow = infoWindowRef.current;
        if (infoWindow) {
          infoWindow.setContent(createInfoContent(point));
          infoWindow.open({ map, anchor: marker });
        }
      });
      bounds.extend(marker.getPosition() ?? { lat: point.lat, lng: point.lng });
      return marker;
    });

    if (fitBounds && points.length > 1) {
      map.fitBounds(bounds, 32);
    } else {
      map.setCenter({ lat: center[0], lng: center[1] });
      map.setZoom(zoom);
    }
  }, [center[0], center[1], fitBounds, mapReady, onSelect, points, selectedId, zoom]);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface px-6 text-center text-sm text-muted-foreground">
        {loadError}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" aria-label="Mapa de pontos e instituições" />;
}

declare global {
  interface Window {
    initVemDaGenteMap?: () => void;
  }
}