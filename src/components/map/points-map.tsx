import { Button } from "@/components/ui/button";
import { ClientOnly } from "@tanstack/react-router";
import { Component, lazy, Suspense, useId, useState } from "react";
import type { ReactNode, ErrorInfo } from "react";

import type { MapPoint } from "./points-map-impl";

const PointsMapImpl = lazy(() => import("./points-map-impl"));

export type { MapPoint };

class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha na visualização do mapa:", error, info.componentStack);
  }
  override render() {
    if (this.state.failed)
      return (
        <div
          role="alert"
          className="flex h-full flex-col items-center justify-center gap-3 bg-surface p-5 text-center"
        >
          <p>O mapa não carregou. Você pode continuar pela lista de locais e pela busca acima.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </div>
      );
    return this.props.children;
  }
}

function MapSkeleton() {
  return (
    <div
      role="status"
      className="flex h-full w-full items-center justify-center bg-surface text-sm text-muted-foreground"
    >
      Carregando mapa…
    </div>
  );
}

export function PointsMap(props: {
  center: [number, number];
  zoom?: number;
  points: MapPoint[];
  onSelect?: (id: string) => void;
  onPick?: (lat: number, lng: number) => void;
  selectedId?: string | null;
  fitBounds?: boolean;
  className?: string;
  initiallyVisible?: boolean;
}) {
  const { className, initiallyVisible = Boolean(props.onPick), ...rest } = props;
  const [visible, setVisible] = useState(initiallyVisible);
  const mapId = useId();
  return (
    <div className="min-w-0">
      <Button
        variant="outline"
        className="mb-3"
        aria-expanded={visible}
        aria-controls={mapId}
        onClick={() => setVisible(!visible)}
      >
        {visible ? "Ocultar mapa" : "Mostrar mapa"}
      </Button>
      <p className="mb-3 text-sm text-muted-foreground">
        O mapa é uma visualização complementar. Consulte também os endereços e contatos apresentados
        em texto.
      </p>
      <div
        id={mapId}
        hidden={!visible}
        role="region"
        aria-label="Mapa de locais"
        className={
          // Mantém controles e marcadores do mapa abaixo dos menus e do cabeçalho.
          "relative isolate " +
          (className ??
            "h-[420px] w-full overflow-hidden rounded-xl border border-border bg-surface")
        }
      >
        {visible && (
          <MapErrorBoundary>
            <ClientOnly fallback={<MapSkeleton />}>
              <Suspense fallback={<MapSkeleton />}>
                <PointsMapImpl {...rest} />
              </Suspense>
            </ClientOnly>
          </MapErrorBoundary>
        )}
      </div>
    </div>
  );
}
