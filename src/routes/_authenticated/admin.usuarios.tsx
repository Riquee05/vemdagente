import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: AdminUsuarios,
});

const roles = [
  { value: "donor", label: "Doador" },
  { value: "person_in_need", label: "Necessitado" },
  { value: "admin", label: "Administrador" },
];

function AdminUsuarios() {
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, default_city, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setRole = useMutation({
    mutationFn: async (input: { id: string; role: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role: input.role })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error("Não conseguimos atualizar o papel."),
  });

  return (
    <div>
      <h2 className="text-lg font-semibold">Usuários</h2>
      {users.isLoading && <Skeleton className="mt-4 h-40 w-full" />}
      {users.isSuccess && users.data.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
      )}
      <ul className="mt-4 space-y-3">
        {(users.data ?? []).map((user) => (
          <li
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{user.full_name ?? "Sem nome"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.default_city ?? "sem cidade"} ·{" "}
                {new Date(user.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Select value={user.role} onValueChange={(role) => setRole.mutate({ id: user.id, role })}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
    </div>
  );
}
