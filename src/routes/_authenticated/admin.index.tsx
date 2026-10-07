import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { importGooglePoints } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPontos,
});

const PRESETS = [
  { value: "all", label: "Tudo" },
  { value: "doacao", label: "Pontos de doação" },
  { value: "apoio", label: "Redes de apoio" },
] as const;

function AdminPontos() {
  const queryClient = useQueryClient();
  const [city, setCity] = useState("");
  const [preset, setPreset] = useState<"all" | "doacao" | "apoio">("all");
  const runImport = useServerFn(importGooglePoints);

  const points = useQuery({
    queryKey: ["admin-points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_points")
        .select("id, name, city, state, curation_status, is_active, source, photo_url, address")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const importer = useMutation({
    mutationFn: () => runImport({ data: { city: city.trim(), preset } }),
    onSuccess: (result) => {
      toast.success(`${result.created} ponto(s) importado(s) — ${result.skipped} já existiam.`);
      queryClient.invalidateQueries({ queryKey: ["admin-points"] });
      queryClient.invalidateQueries({ queryKey: ["verified-points"] });
    },
    onError: (error: Error) => toast.error(error.message || "Falha na importação."),
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: { curation_status?: string; is_active?: boolean };
    }) => {
      const { error } = await supabase
        .from("collection_points")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ponto atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-points"] });
    },
    onError: () => toast.error("Não conseguimos atualizar o ponto."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collection_points").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ponto removido.");
      queryClient.invalidateQueries({ queryKey: ["admin-points"] });
    },
    onError: () => toast.error("Não conseguimos remover o ponto."),
  });

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Catalogar redes de apoio e pontos de doação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Busca ONGs, bazares solidários, bancos de alimentos, casas de acolhimento, albergues, CRAS
          e instituições de caridade da cidade informada — com endereço, telefone, horários, foto e
          as categorias que cada local costuma receber.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (city.trim().length < 2) {
              toast.error("Informe a cidade.");
              return;
            }
            importer.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="import-city">Cidade</Label>
            <Input
              id="import-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="São Paulo, SP"
              maxLength={80}
              className="w-64"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="import-preset">Tipo de rede</Label>
            <select
              id="import-preset"
              value={preset}
              onChange={(event) => setPreset(event.target.value as typeof preset)}
              className="h-10 rounded-md border-2 border-border bg-background px-3 text-sm"
            >
              {PRESETS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={importer.isPending}>
            {importer.isPending ? "Importando..." : "Importar"}
          </Button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Pontos cadastrados</h2>
        {points.isLoading && <Skeleton className="mt-4 h-40 w-full" />}
        {points.isSuccess && points.data.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum ponto cadastrado ainda.</p>
        )}
        <ul className="mt-4 space-y-3">
          {(points.data ?? []).map((point) => (
            <li
              key={point.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{point.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {point.address ?? point.city} · {point.curation_status} ·{" "}
                  {point.is_active ? "ativo" : "inativo"} · {point.source}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {point.curation_status !== "verified" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      update.mutate({ id: point.id, patch: { curation_status: "verified" } })
                    }
                  >
                    Verificar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    update.mutate({ id: point.id, patch: { is_active: !point.is_active } })
                  }
                >
                  {point.is_active ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove.mutate(point.id)}>
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
