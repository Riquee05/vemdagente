import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import type { MapPoint } from "./points-map-impl";

const PointsMapImpl = lazy(() => import("./points-map-impl"));

export type { MapPoint };

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface text-sm text-muted-foreground">
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
  className?: string;
}) {
  const { className, ...rest } = props;
  return (
    <div
      className={
        className ?? "h-[420px] w-full overflow-hidden rounded-xl border border-border bg-surface"
      }
    >
      <ClientOnly fallback={<MapSkeleton />}>
        <Suspense fallback={<MapSkeleton />}>
          <PointsMapImpl {...rest} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
