import { Button } from "@/components/ui/button";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useId, useState } from "react";

import type { MapPoint } from "./points-map-impl";

const PointsMapImpl = lazy(() => import("./points-map-impl"));

export type { MapPoint };

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
}) {
  const { className, ...rest } = props;
  const [visible, setVisible] = useState(true);
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
      {visible && (
        <div
          id={mapId}
          role="region"
          aria-label="Mapa de locais"
          className={
            // Mantém controles e marcadores do mapa abaixo dos menus e do cabeçalho.
            "relative isolate " +
            (className ??
              "h-[420px] w-full overflow-hidden rounded-xl border border-border bg-surface")
          }
        >
          <ClientOnly fallback={<MapSkeleton />}>
            <Suspense fallback={<MapSkeleton />}>
              <PointsMapImpl {...rest} />
            </Suspense>
          </ClientOnly>
        </div>
      )}
    </div>
  );
}
