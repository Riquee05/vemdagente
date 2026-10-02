import { useEffect, useRef, useState } from "react";

export type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string | null;
};

type GoogleMapsApi = typeof google.maps;

type MarkerRecord = {
  marker: google.maps.Marker;
  listener: google.maps.MapsEventListener;
};

let mapsPromise: Promise<GoogleMapsApi> | null = null;

function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Mapa indisponível."));
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  const browserKey = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    string | undefined;
  const trackingId = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
    string | undefined;
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

function createPointsKey(points: MapPoint[]) {
  return points
    .map(({ id, lat, lng }) => `${id}:${lat}:${lng}`)
    .sort()
    .join("|");
}

function createMarkerKey(points: MapPoint[]) {
  return points
    .map(({ id, lat, lng, name, subtitle }) => `${id}:${lat}:${lng}:${name}:${subtitle ?? ""}`)
    .sort()
    .join("|");
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
  const markersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  const pointsRef = useRef(points);
  const initialViewportRef = useRef({ center, zoom });
  const previousViewportRef = useRef<{
    centerKey: string;
    zoom: number;
    pointsKey: string;
    fitBounds: boolean;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pointsKey = createPointsKey(points);
  const markerKey = createMarkerKey(points);
  const centerLat = center[0];
  const centerLng = center[1];
  pointsRef.current = points;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    let clickListener: google.maps.MapsEventListener | null = null;
    const markers = markersRef.current;

    void loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const initialViewport = initialViewportRef.current;
        const map = new maps.Map(containerRef.current, {
          center: { lat: initialViewport.center[0], lng: initialViewport.center[1] },
          zoom: initialViewport.zoom,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        mapRef.current = map;
        infoWindowRef.current = new maps.InfoWindow();
        setMapReady(true);
        clickListener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
          const location = event.latLng;
          if (location) onPickRef.current?.(location.lat(), location.lng());
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Mapa indisponível.");
      });

    return () => {
      cancelled = true;
      clickListener?.remove();
      markers.forEach(({ marker, listener }) => {
        listener.remove();
        marker.setMap(null);
      });
      markers.clear();
      infoWindowRef.current?.close();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach(({ marker, listener }) => {
      listener.remove();
      marker.setMap(null);
    });
    markersRef.current.clear();

    pointsRef.current.forEach((point) => {
      const markerOptions: google.maps.MarkerOptions = {
        map,
        position: { lat: point.lat, lng: point.lng },
        title: point.name,
        zIndex: 1,
      };
      const marker = new window.google.maps.Marker(markerOptions);
      const listener = marker.addListener("click", () => {
        onSelectRef.current?.(point.id);
        const infoWindow = infoWindowRef.current;
        if (infoWindow) {
          infoWindow.setContent(createInfoContent(point));
          infoWindow.open({ map, anchor: marker });
        }
      });
      markersRef.current.set(point.id, { marker, listener });
    });
  }, [mapReady, markerKey]);

  useEffect(() => {
    markersRef.current.forEach(({ marker }, id) => {
      marker.setZIndex(id === selectedId ? 2 : 1);
    });

    if (!selectedId) {
      infoWindowRef.current?.close();
      return;
    }

    const selectedPoint = pointsRef.current.find((point) => point.id === selectedId);
    const selectedMarker = markersRef.current.get(selectedId)?.marker;
    const map = mapRef.current;
    if (selectedPoint && selectedMarker && map && infoWindowRef.current) {
      infoWindowRef.current.setContent(createInfoContent(selectedPoint));
      infoWindowRef.current.open({ map, anchor: selectedMarker });
    }
  }, [markerKey, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    const currentPoints = pointsRef.current;
    const centerKey = `${centerLat}:${centerLng}`;
    const previous = previousViewportRef.current;
    const centerChanged =
      previous !== null && (previous.centerKey !== centerKey || previous.zoom !== zoom);
    const geographyChanged = previous === null || previous.pointsKey !== pointsKey;
    const fitBoundsEnabled = previous === null || (!previous.fitBounds && fitBounds);

    if (fitBounds && currentPoints.length > 0 && (geographyChanged || fitBoundsEnabled)) {
      if (currentPoints.length === 1) {
        map.setCenter({ lat: currentPoints[0].lat, lng: currentPoints[0].lng });
        map.setZoom(zoom);
      } else {
        const bounds = new window.google.maps.LatLngBounds();
        currentPoints.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }));
        map.fitBounds(bounds, 32);
      }
    } else if (centerChanged) {
      map.setCenter({ lat: centerLat, lng: centerLng });
      map.setZoom(zoom);
    }

    previousViewportRef.current = { centerKey, zoom, pointsKey, fitBounds };
  }, [centerLat, centerLng, fitBounds, mapReady, pointsKey, zoom]);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface px-6 text-center text-sm text-muted-foreground">
        {loadError}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full" aria-label="Mapa de pontos e instituições" />
  );
}

declare global {
  interface Window {
    initVemDaGenteMap?: () => void;
  }
}
