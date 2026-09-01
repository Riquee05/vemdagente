import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories, type ItemCategory } from "@/lib/points";

export type PointNeed = {
  id: string;
  point_id: string;
  category_id: string;
  urgency: string;
  note: string | null;
  is_active: boolean;
  category: ItemCategory;
};

const URGENCY_OPTIONS = [
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Urgente" },
  { value: "critical", label: "Crítica" },
] as const;

function urgencyBadge(urgency: string) {
  switch (urgency) {
    case "critical":
      return <Badge variant="destructive">Crítica</Badge>;
    case "high":
      return <Badge variant="destructive">Urgente</Badge>;
    case "low":
      return <Badge variant="secondary">Baixa</Badge>;
    default:
      return <Badge variant="outline">Normal</Badge>;
  }
}

/** Editor de necessidades de um ponto. Usado no admin e em "Minha conta". */
export function PointNeedsEditor({
  pointId,
  readOnly,
  onChange,
}: {
  pointId: string;
  readOnly?: boolean;
  onChange?: () => void;
}) {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["item-categories"], queryFn: fetchCategories });

  const needs = useQuery({
    queryKey: ["point-needs", pointId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_needs")
        .select("id, point_id, category_id, urgency, note, is_active, item_categories ( id, slug, label, kind )")
        .eq("point_id", pointId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((n: any) => ({
        id: n.id,
        point_id: n.point_id,
        category_id: n.category_id,
        urgency: n.urgency,
        note: n.note,
        is_active: n.is_active,
        category: n.item_categories as ItemCategory,
      })) as PointNeed[];
    },
  });

  const [newCategory, setNewCategory] = useState("");
  const [newUrgency, setNewUrgency] = useState<string>("normal");
  const [newNote, setNewNote] = useState("");

  const save = useMutation({
    mutationFn: async (input: { id?: string; category_id: string; urgency: string; note: string | null; is_active?: boolean }) => {
      if (input.id) {
        const { error } = await supabase
          .from("point_needs")
          .update({ urgency: input.urgency, note: input.note, is_active: input.is_active ?? true })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("point_needs").insert({
          point_id: pointId,
          category_id: input.category_id,
          urgency: input.urgency,
          note: input.note,
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["point-needs", pointId] });
      queryClient.invalidateQueries({ queryKey: ["point", pointId] });
      setNewCategory("");
      setNewUrgency("normal");
      setNewNote("");
      onChange?.();
    },
    onError: (error) => {
      console.error("save need error:", error);
      toast.error(error instanceof Error ? error.message : "Não conseguimos salvar a necessidade. Tente de novo.");
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("point_needs").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["point-needs", pointId] });
      queryClient.invalidateQueries({ queryKey: ["point", pointId] });
      onChange?.();
    },
    onError: () => toast.error("Não conseguimos atualizar o status."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("point_needs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["point-needs", pointId] });
      queryClient.invalidateQueries({ queryKey: ["point", pointId] });
      onChange?.();
    },
    onError: () => toast.error("Não conseguimos remover a necessidade."),
  });

  const availableCategories = (categories.data ?? []).filter(
    (c) => !needs.data?.some((n) => n.is_active && n.category_id === c.id),
  );

  return (
    <div className="space-y-4">
      {needs.isLoading && <Skeleton className="h-20 w-full" />}

      {needs.isSuccess && needs.data.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma necessidade registrada para este ponto.</p>
      )}

      {needs.isSuccess && needs.data.length > 0 && (
        <ul className="space-y-2">
          {needs.data.map((need) => (
            <li
              key={need.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                need.is_active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{need.category.label}</span>
                {urgencyBadge(need.urgency)}
                {!need.is_active && <Badge variant="outline">inativa</Badge>}
              </div>
              {need.note ? <p className="w-full text-xs text-muted-foreground">{need.note}</p> : null}
              {!readOnly && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggle.mutate({ id: need.id, is_active: !need.is_active })}
                    disabled={toggle.isPending}
                  >
                    {need.is_active ? "Desativar" : "Reativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm("Remover esta necessidade permanentemente?")) remove.mutate(need.id);
                    }}
                    disabled={remove.isPending}
                  >
                    Remover
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="rounded-lg border border-dashed border-border p-4">
          <h4 className="text-sm font-semibold">Adicionar necessidade</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`need-category-${pointId}`}>Categoria</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger id={`need-category-${pointId}`} className="mt-1.5">
                  <SelectValue placeholder="Escolha uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`need-urgency-${pointId}`}>Urgência</Label>
              <Select value={newUrgency} onValueChange={setNewUrgency}>
                <SelectTrigger id={`need-urgency-${pointId}`} className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`need-note-${pointId}`}>Observação (opcional)</Label>
              <Input
                id={`need-note-${pointId}`}
                className="mt-1.5"
                placeholder="Ex.: precisamos de 20 cobertores para o inverno"
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
              />
            </div>
          </div>
          <Button
            className="mt-3"
            size="sm"
            disabled={!newCategory || save.isPending}
            onClick={() =>
              save.mutate({ category_id: newCategory, urgency: newUrgency, note: newNote.trim() || null })
            }
          >
            {save.isPending ? "Salvando…" : "Adicionar necessidade"}
          </Button>
        </div>
      )}
    </div>
  );
}
