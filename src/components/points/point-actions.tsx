import { useState } from "react";
import { useFavorites } from "@/hooks/use-favorites";
import { institutionShareText } from "@/lib/favorites";
import { Button } from "@/components/ui/button";
export function PointActions({
  point,
}: {
  point: { id: string; name: string; address: string | null; city: string };
}) {
  const { ids, toggle } = useFavorites();
  const [error, setError] = useState("");
  const saved = ids.includes(point.id);
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-pressed={saved}
          aria-label={`${saved ? "Remover" : "Salvar"} ${point.name} ${saved ? "dos" : "nos"} favoritos`}
          onClick={() => {
            setError("");
            try {
              toggle(point.id);
            } catch (error) {
              setError(error instanceof Error ? error.message : "Não foi possível salvar.");
            }
          }}
        >
          {saved ? "★ Salvo" : "☆ Salvar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Compartilhar ${point.name} pelo WhatsApp`}
          onClick={() => {
            const text = institutionShareText(point, window.location.origin);
            window.open(
              `https://wa.me/?text=${encodeURIComponent(text)}`,
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          Compartilhar no WhatsApp
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
