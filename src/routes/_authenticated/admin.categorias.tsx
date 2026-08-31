import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: AdminCategorias,
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function AdminCategorias() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");

  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_categories")
        .select("id, slug, label, kind")
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const clean = label.trim();
      if (clean.length < 2) throw new Error("Nome muito curto.");
      const { error } = await supabase
        .from("item_categories")
        .insert({ label: clean, slug: slugify(clean), kind: "item" });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      toast.success("Categoria criada.");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível criar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("item_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria removida.");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: () => toast.error("Não conseguimos remover (talvez esteja em uso)."),
  });

  return (
    <div className="space-y-8">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="category-label">Nova categoria</Label>
          <Input
            id="category-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Cobertores"
            maxLength={60}
            className="w-64"
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          Adicionar
        </Button>
      </form>

      {categories.isLoading && <Skeleton className="h-32 w-full" />}
      <ul className="space-y-3">
        {(categories.data ?? []).map((category) => (
          <li
            key={category.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="font-medium">{category.label}</p>
              <p className="text-xs text-muted-foreground">{category.slug}</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => remove.mutate(category.id)}>
              Excluir
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
