import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PointPhoto } from "@/components/points/point-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/curadoria")({
  component: AdminCuradoria,
});

const FILTERS = [
  { value: "pending", label: "Aguardando" },
  { value: "verified", label: "Aprovados" },
  { value: "rejected", label: "Recusados" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function AdminCuradoria() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");

  const counts = useQuery({
    queryKey: ["curation-counts"],
    queryFn: async () => {
      const entries = await Promise.all(
        FILTERS.map(async (option) => {
          const { count, error } = await supabase
            .from("collection_points")
            .select("id", { count: "exact", head: true })
            .eq("curation_status", option.value);
          if (error) throw error;
          return [option.value, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<Filter, number>;
    },
  });

  const queue = useQuery({
    queryKey: ["curation-queue", filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_points")
        .select(
          "id, name, description, address, city, state, phone, whatsapp, website, opening_hours, photo_url, source, is_active, created_at",
        )
        .eq("curation_status", filter)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async (input: { id: string; decision: "verified" | "rejected" | "pending" }) => {
      const { error } = await supabase
        .from("collection_points")
        .update({
          curation_status: input.decision,
          is_active: input.decision !== "rejected",
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      toast.success(
        input.decision === "verified"
          ? "Ponto aprovado — já aparece no mapa."
          : input.decision === "rejected"
            ? "Ponto recusado e escondido do mapa."
            : "Ponto devolvido para a fila.",
      );
      queryClient.invalidateQueries({ queryKey: ["curation-queue"] });
      queryClient.invalidateQueries({ queryKey: ["curation-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-points"] });
      queryClient.invalidateQueries({ queryKey: ["verified-points"] });
    },
    onError: () => toast.error("Não conseguimos salvar a decisão."),
  });

  const items = queue.data ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Curadoria de pontos e redes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nada aparece no mapa público sem sua aprovação. Aprove para publicar, recuse para esconder
          — você pode reverter qualquer decisão depois.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={filter === option.value ? "default" : "outline"}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
              {counts.data ? ` (${counts.data[option.value]})` : ""}
            </Button>
          ))}
        </div>
      </div>

      {queue.isLoading && <Skeleton className="h-48 w-full" />}

      {queue.isSuccess && items.length === 0 && (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {filter === "pending"
            ? "Nenhum ponto aguardando curadoria agora."
            : "Nenhum ponto nessa lista."}
        </p>
      )}

      <ul className="space-y-4">
        {items.map((point) => (
          <li key={point.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
            <PointPhoto
              path={point.photo_url}
              alt={`Foto de ${point.name}`}
              className="h-24 w-24 shrink-0 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{point.name}</h3>
                <Badge variant="secondary">
                  {point.source === "google_maps" ? "Google Maps" : "Cadastro manual"}
                </Badge>
                {!point.is_active && <Badge variant="outline">inativo</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {point.address ? `${point.address} — ` : ""}
                {point.city}
                {point.state ? `/${point.state}` : ""}
              </p>
              {point.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {point.description}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {[point.phone, point.whatsapp, point.website, point.opening_hours]
                  .filter(Boolean)
                  .join(" · ") || "Sem contato informado"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {filter !== "verified" && (
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: point.id, decision: "verified" })}
                  >
                    Aprovar
                  </Button>
                )}
                {filter !== "rejected" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: point.id, decision: "rejected" })}
                  >
                    Recusar
                  </Button>
                )}
                {filter !== "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: point.id, decision: "pending" })}
                  >
                    Voltar para a fila
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost">
                  <Link to="/pontos/$pointId" params={{ pointId: point.id }}>
                    Ver ficha
                  </Link>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
