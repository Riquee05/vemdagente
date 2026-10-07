import { PointAccessibilityEditor } from "@/components/admin/point-accessibility-editor";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { OngImportPanel } from "@/components/admin/ong-import-panel";
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
  { value: "stale", label: "Revisar informações" },
  { value: "rejected", label: "Recusados" },
] as const;

const reviewCutoff = () => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
const reviewCondition = () =>
  `confirmed_at.is.null,confirmed_at.lt.${reviewCutoff()},confirmation_status.eq.needs_update`;

type Filter = (typeof FILTERS)[number]["value"];

function AdminCuradoria() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");

  const counts = useQuery({
    queryKey: ["curation-counts"],
    queryFn: async () => {
      const entries = await Promise.all(
        FILTERS.map(async (option) => {
          let query = supabase
            .from("collection_points")
            .select("id", { count: "exact", head: true })
            .eq("curation_status", option.value === "stale" ? "verified" : option.value);
          if (option.value === "stale") query = query.eq("is_active", true).or(reviewCondition());
          const { count, error } = await query;
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
      let query = supabase
        .from("collection_points")
        .select(
          "id, name, description, address, city, state, phone, whatsapp, website, opening_hours, donation_hours, photo_url, source, is_active, created_at, confirmation_status, confirmed_at, hidden_reason",
        )
        .eq("curation_status", filter === "stale" ? "verified" : filter)
        .order(filter === "stale" ? "confirmed_at" : "created_at", {
          ascending: filter === "stale",
          nullsFirst: true,
        })
        .limit(100);
      if (filter === "stale") query = query.eq("is_active", true).or(reviewCondition());
      const { data, error } = await query;
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

  const confirmReceiving = useMutation({
    mutationFn: async (input: {
      id: string;
      status: "unconfirmed" | "confirmed" | "needs_update";
    }) => {
      const { error } = await supabase
        .from("collection_points")
        .update({
          confirmation_status: input.status,
          confirmed_at: input.status === "confirmed" ? new Date().toISOString() : null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status de confirmação atualizado.");
      queryClient.invalidateQueries({ queryKey: ["curation-counts"] });
      queryClient.invalidateQueries({ queryKey: ["curation-queue"] });
      queryClient.invalidateQueries({ queryKey: ["verified-points"] });
    },
    onError: () => toast.error("Não conseguimos atualizar a confirmação."),
  });

  const items = queue.data ?? [];

  return (
    <div className="space-y-6">
      <OngImportPanel />
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

      {filter === "stale" && (
        <p className="text-sm text-muted-foreground">
          Locais ativos aprovados sem confirmação, sinalizados para atualização ou confirmados há
          mais de 90 dias. A revisão não altera automaticamente o status público.
        </p>
      )}
      {queue.isError && (
        <div role="alert">
          Não foi possível carregar a fila.{" "}
          <Button onClick={() => void queue.refetch()}>Tentar novamente</Button>
        </div>
      )}
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
              adminAccess
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{point.name}</h3>
                <Badge variant="secondary">
                  {point.source === "google_maps" ? "Google Maps" : "Cadastro manual"}
                </Badge>
                {!point.is_active && <Badge variant="outline">inativo</Badge>}
                <Badge variant={point.confirmation_status === "confirmed" ? "default" : "outline"}>
                  {point.confirmation_status === "confirmed"
                    ? "Doações confirmadas"
                    : point.confirmation_status === "needs_update"
                      ? "Precisa atualizar"
                      : "Não confirmado"}
                </Badge>
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
              <PointAccessibilityEditor pointId={point.id} />
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
                <Button
                  size="sm"
                  variant="outline"
                  disabled={confirmReceiving.isPending}
                  onClick={() => confirmReceiving.mutate({ id: point.id, status: "confirmed" })}
                >
                  Confirmar recebimento
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={confirmReceiving.isPending}
                  onClick={() => confirmReceiving.mutate({ id: point.id, status: "needs_update" })}
                >
                  Marcar desatualizado
                </Button>
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
