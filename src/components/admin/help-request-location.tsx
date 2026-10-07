import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { locateAdminHelpRequest } from "@/lib/admin-help-requests.functions";

export function HelpRequestLocation({
  id,
  lat,
  lng,
  city,
}: {
  id: string;
  lat: number | null;
  lng: number | null;
  city: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const locate = useServerFn(locateAdminHelpRequest);
  const location = useQuery({
    queryKey: ["admin-help-location", id, lat, lng],
    queryFn: () => locate({ data: { id } }),
    enabled,
    retry: false,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const valid =
    lat !== null &&
    lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
  if (!valid)
    return (
      <p className="mt-3 text-sm">
        Cidade informada: {city}. Este pedido não tem um ponto no mapa.
      </p>
    );
  return (
    <div className="mt-4 space-y-2 rounded border border-border p-3">
      <p className="font-medium">Localização aproximada</p>
      <p className="break-words text-sm">{location.data?.label || `Cidade informada: ${city}`}</p>
      <p className="text-xs text-muted-foreground">
        O ponto selecionado pode ser a posição do aparelho ou uma referência; não confirma o
        endereço residencial.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver no mapa <span className="sr-only">(abre em outra aba)</span>
          </a>
        </Button>
        {!location.data && (
          <Button
            variant="outline"
            disabled={location.isFetching}
            onClick={() => {
              if (enabled) void location.refetch();
              else setEnabled(true);
            }}
          >
            {location.isFetching
              ? "Identificando região…"
              : location.isError || (enabled && !location.isFetching)
                ? "Tentar identificar novamente"
                : "Identificar região"}
          </Button>
        )}
      </div>
      {location.isError && (
        <p role="alert" className="text-sm">
          Não foi possível identificar o endereço agora. Você pode consultar o ponto no mapa.
        </p>
      )}
      {enabled && location.isSuccess && !location.data && (
        <p role="status" className="text-sm">
          Não há endereço disponível para este ponto. Consulte o mapa.
        </p>
      )}
      {location.data && (
        <p className="text-xs text-muted-foreground">
          Endereço aproximado: ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            colaboradores do OpenStreetMap
          </a>
          .
        </p>
      )}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Ver coordenadas</summary>
        <p className="mt-1">
          Latitude: {lat} · Longitude: {lng}
        </p>
      </details>
    </div>
  );
}
