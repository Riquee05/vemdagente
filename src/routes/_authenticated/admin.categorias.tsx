import { AccessibleForm } from "@/components/accessibility/accessible-form";
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

/** Causas atendidas pelos pontos — cadastro, edição e exclusão sem mexer no banco. */
function CausesManager() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const causes = useQuery({
    queryKey: ["admin-causes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("causes")
        .select("id, slug, label")
        .order("label");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-causes"] });
    queryClient.invalidateQueries({ queryKey: ["causes"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const clean = label.trim();
      if (clean.length < 2) throw new Error("Nome muito curto.");
      const { error } = await supabase
        .from("causes")
        .insert({ label: clean, slug: slugify(clean) });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      toast.success("Causa criada.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível criar a causa."),
  });

  const update = useMutation({
    mutationFn: async () => {
      const clean = editingLabel.trim();
      if (clean.length < 2) throw new Error("Nome muito curto.");
      const { error } = await supabase
        .from("causes")
        .update({ label: clean, slug: slugify(clean) })
        .eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      toast.success("Causa atualizada.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("causes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Causa removida.");
      refresh();
    },
    onError: () => toast.error("Não conseguimos remover (talvez esteja vinculada a pontos)."),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl">Causas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          As causas aparecem no cadastro de pontos e nos filtros do mapa e da página Doar.
        </p>
      </div>

      <AccessibleForm
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="cause-label">Nova causa</Label>
          <Input
            id="cause-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex.: Doação de sangue"
            maxLength={60}
            className="w-64"
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          Adicionar causa
        </Button>
      </AccessibleForm>

      {causes.isLoading && <Skeleton className="h-32 w-full" />}
      <ul className="space-y-3">
        {(causes.data ?? []).map((cause) => (
          <li
            key={cause.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            {editingId === cause.id ? (
              <AccessibleForm
                className="flex flex-1 flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  update.mutate();
                }}
              >
                <Input
                  value={editingLabel}
                  onChange={(event) => setEditingLabel(event.target.value)}
                  maxLength={60}
                  className="w-64"
                  aria-label="Nome da causa"
                />
                <Button type="submit" size="sm" disabled={update.isPending}>
                  Salvar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(null)}
                >
                  Cancelar
                </Button>
              </AccessibleForm>
            ) : (
              <>
                <div>
                  <p className="font-medium">{cause.label}</p>
                  <p className="text-xs text-muted-foreground">{cause.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(cause.id);
                      setEditingLabel(cause.label);
                    }}
                  >
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove.mutate(cause.id)}>
                    Excluir
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminCategorias() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

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

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["item-categories"] });
  };

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
      refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível criar."),
  });

  const update = useMutation({
    mutationFn: async () => {
      const clean = editingLabel.trim();
      if (clean.length < 2) throw new Error("Nome muito curto.");
      const { error } = await supabase
        .from("item_categories")
        .update({ label: clean, slug: slugify(clean) })
        .eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      toast.success("Categoria atualizada.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("item_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria removida.");
      refresh();
    },
    onError: () => toast.error("Não conseguimos remover (talvez esteja em uso)."),
  });

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl">Categorias de itens</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O que os pontos aceitam receber (roupas, alimentos, brinquedos…).
          </p>
        </div>

        <AccessibleForm
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
        </AccessibleForm>

        {categories.isLoading && <Skeleton className="h-32 w-full" />}
        <ul className="space-y-3">
          {(categories.data ?? []).map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              {editingId === category.id ? (
                <AccessibleForm
                  className="flex flex-1 flex-wrap items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    update.mutate();
                  }}
                >
                  <Input
                    value={editingLabel}
                    onChange={(event) => setEditingLabel(event.target.value)}
                    maxLength={60}
                    className="w-64"
                    aria-label="Nome da categoria"
                  />
                  <Button type="submit" size="sm" disabled={update.isPending}>
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </AccessibleForm>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{category.label}</p>
                    <p className="text-xs text-muted-foreground">{category.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingLabel(category.label);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => remove.mutate(category.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <CausesManager />
    </div>
  );
}
