import { CampaignEditor } from "@/components/points/campaign-editor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { fetchCategories, type ItemCategory } from "@/lib/points";
import {
  addPointNeed,
  deletePointNeed,
  listPointNeeds,
  updatePointNeed,
} from "@/lib/points-needs.functions";

export type PointNeed = {
  id: string;
  point_id: string;
  category_id: string;
  urgency: string;
  note: string | null;
  is_active: boolean;
  expires_at: string | null;
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

  const listNeeds = useServerFn(listPointNeeds);
  const addNeed = useServerFn(addPointNeed);
  const patchNeed = useServerFn(updatePointNeed);
  const removeNeed = useServerFn(deletePointNeed);

  const needs = useQuery({
    queryKey: ["point-needs", pointId],
    queryFn: async () => {
      const rows = await listNeeds({ data: { pointId } });
      return (rows ?? []).map((n) => ({
        id: n.id,
        point_id: n.point_id,
        category_id: n.category_id,
        urgency: n.urgency,
        note: n.note,
        is_active: n.is_active,
        expires_at: n.expires_at,
        category: (n.item_categories ?? {
          id: n.category_id,
          slug: "",
          label: "Categoria",
          kind: "item",
        }) as ItemCategory,
      })) as PointNeed[];
    },
  });

  const [newCategory, setNewCategory] = useState("");
  const [newUrgency, setNewUrgency] = useState<string>("normal");
  const [newExpiry, setNewExpiry] = useState("");
  const [newNote, setNewNote] = useState("");

  const save = useMutation({
    mutationFn: async (input: {
      id?: string;
      category_id: string;
      urgency: string;
      note: string | null;
      is_active?: boolean;
    }) => {
      if (input.id) {
        await patchNeed({
          data: {
            needId: input.id,
            urgency: input.urgency as "low" | "normal" | "high" | "critical",
            note: input.note,
            isActive: input.is_active ?? true,
          },
        });
      } else {
        await addNeed({
          data: {
            pointId,
            expiresAt: newExpiry || null,
            categoryId: input.category_id,
            urgency: input.urgency as "low" | "normal" | "high" | "critical",
            note: input.note,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["point-needs", pointId] });
      queryClient.invalidateQueries({ queryKey: ["point", pointId] });
      setNewCategory("");
      setNewUrgency("normal");
      setNewNote("");
      setNewExpiry("");
      onChange?.();
    },
    onError: (error) => {
      console.error("save need error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não conseguimos salvar a necessidade. Tente de novo.",
      );
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await patchNeed({ data: { needId: id, isActive: is_active } });
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
      await removeNeed({ data: { needId: id } });
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
        <p className="text-sm text-muted-foreground">
          Nenhuma necessidade registrada para este ponto.
        </p>
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
              {need.note ? (
                <p className="w-full text-xs text-muted-foreground">{need.note}</p>
              ) : null}
              {need.expires_at && (
                <p className="w-full text-xs text-muted-foreground">
                  Válida até {need.expires_at.split("-").reverse().join("/")}
                </p>
              )}
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
                      if (window.confirm("Remover esta necessidade permanentemente?"))
                        remove.mutate(need.id);
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
          <CampaignEditor pointId={pointId} />
          <h4 className="mt-4 text-sm font-semibold">Adicionar necessidade</h4>
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
            <div>
              <Label htmlFor={`need-expiry-${pointId}`}>Válida até (opcional)</Label>
              <Input
                id={`need-expiry-${pointId}`}
                type="date"
                value={newExpiry}
                onChange={(event) => setNewExpiry(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Após esta data, a necessidade deixa de aparecer na busca pública.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`need-note-${pointId}`}>Quantidade e orientações (opcional)</Label>
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
              save.mutate({
                category_id: newCategory,
                urgency: newUrgency,
                note: newNote.trim() || null,
              })
            }
          >
            {save.isPending ? "Salvando…" : "Adicionar necessidade"}
          </Button>
        </div>
      )}
    </div>
  );
}
