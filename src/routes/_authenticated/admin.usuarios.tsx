import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { adminStepUpStatus } from "@/lib/admin-2fa.functions";
import { listPlatformUsers, setAdminAccess, setProfileRole } from "@/lib/security.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: AdminUsuarios,
});

const roles = [
  { value: "donor", label: "Doador" },
  { value: "person_in_need", label: "Necessitado" },
] as const;

function AdminUsuarios() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listPlatformUsers);
  const fetchStatus = useServerFn(adminStepUpStatus);
  const updateRole = useServerFn(setProfileRole);
  const updateAdmin = useServerFn(setAdminAccess);

  const status = useQuery({ queryKey: ["admin-step-up"], queryFn: () => fetchStatus() });
  const isOwner = status.data?.isOwner === true;

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });


  const setRole = useMutation({
    mutationFn: (input: { user_id: string; role: "donor" | "person_in_need" }) =>
      updateRole({ data: input }),
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos atualizar o perfil."),
  });

  const setAdmin = useMutation({
    mutationFn: (input: { user_id: string; grant: boolean }) => updateAdmin({ data: input }),
    onSuccess: () => {
      toast.success("Acesso administrativo atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não conseguimos alterar o acesso."),
  });

  return (
    <div>
      <h2 className="text-lg font-semibold">Usuários</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isOwner
          ? "Somente você, como dono da plataforma, pode conceder ou revogar acesso administrativo. Toda alteração fica na trilha de auditoria."
          : "Apenas o dono da plataforma pode conceder ou revogar acesso administrativo."}
      </p>
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
              <p className="truncate font-medium">
                {user.full_name ?? "Sem nome"}
                {user.is_owner && (
                  <span className="ml-2 border-2 border-foreground bg-primary px-1.5 text-[10px] font-bold uppercase text-primary-foreground">
                    dono
                  </span>
                )}
                {user.is_admin && !user.is_owner && (
                  <span className="ml-2 border border-current px-1.5 text-[10px] font-bold uppercase">
                    admin
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.default_city ?? "sem cidade"} ·{" "}
                {new Date(user.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={user.role === "person_in_need" ? "person_in_need" : "donor"}
                onValueChange={(role) =>
                  setRole.mutate({ user_id: user.id, role: role as "donor" | "person_in_need" })
                }
              >
                <SelectTrigger className="w-44">
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
              {isOwner && !user.is_owner && (
                <Button
                  variant={user.is_admin ? "outline" : "default"}
                  size="sm"
                  disabled={setAdmin.isPending}
                  onClick={() => setAdmin.mutate({ user_id: user.id, grant: !user.is_admin })}
                >
                  {user.is_admin ? "Revogar admin" : "Tornar admin"}
                </Button>
              )}

            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
