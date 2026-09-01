import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PointNeedsEditor } from "@/components/points/point-needs-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/necessidades")({
  component: AdminNecessidades,
});

type PointRow = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  address: string | null;
  curation_status: string;
  is_active: boolean;
  needs_count: number;
};

function AdminNecessidades() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PointRow | null>(null);

  const points = useQuery({
    queryKey: ["admin-points-needs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_points")
        .select(
          "id, name, city, state, address, curation_status, is_active, point_needs ( id, is_active )",
        )
        .eq("curation_status", "verified")
        .order("created_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data ?? []).map((point) => ({
        id: point.id,
        name: point.name,
        city: point.city,
        state: point.state,
        address: point.address,
        curation_status: point.curation_status,
        is_active: point.is_active,
        needs_count: (point.point_needs as { id: string; is_active: boolean }[]).filter((n) => n.is_active)
          .length,
      })) as PointRow[];
    },
  });

  const filtered = (points.data ?? []).filter((point) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      point.name.toLowerCase().includes(q) ||
      point.city.toLowerCase().includes(q) ||
      (point.address ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Necessidades das instituições</h2>
        <p className="text-sm text-muted-foreground">
          Cadastre o que cada ponto precisa receber agora. As necessidades ativas aparecem na ficha
          pública e ajudam doadores a escolherem onde levar a doação.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="needs-search">Buscar ponto</Label>
        <Input
          id="needs-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome da instituição ou cidade"
          className="max-w-md"
        />
      </div>

      {points.isLoading && <Skeleton className="h-60 w-full" />}

      {points.isSuccess && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {search.trim() ? "Nenhum ponto encontrado para esta busca." : "Nenhum ponto verificado cadastrado."}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((point) => (
          <li
            key={point.id}
            className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="font-medium">{point.name}</p>
              <p className="text-xs text-muted-foreground">
                {point.address ?? `${point.city}${point.state ? `, ${point.state}` : ""}`}
              </p>
              <p className="mt-1 text-xs">
                {point.needs_count > 0 ? (
                  <span className="font-medium text-amber-700">
                    {point.needs_count} necessidade{point.needs_count > 1 ? "s" : ""} ativa
                    {point.needs_count > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sem necessidades ativas</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Sheet
                open={selected?.id === point.id}
                onOpenChange={(open) => setSelected(open ? point : null)}
              >
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full">
                    Editar necessidades
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                  <SheetHeader>
                    <SheetTitle>{point.name}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <PointNeedsEditor pointId={point.id} />
                  </div>
                </SheetContent>
              </Sheet>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/pontos/$pointId" params={{ pointId: point.id }} target="_blank">
                  Ver
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
