import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Skeleton } from "@/components/ui/skeleton";
import { listAuditLog } from "@/lib/security.functions";

export const Route = createFileRoute("/_authenticated/admin/seguranca")({
  component: AdminSeguranca,
});

const actionLabels: Record<string, string> = {
  admin_access_granted: "Concedeu acesso administrativo",
  admin_access_revoked: "Revogou acesso administrativo",
  profile_role_updated: "Alterou o perfil de um usuário",
};

function AdminSeguranca() {
  const fetchLog = useServerFn(listAuditLog);
  const log = useQuery({ queryKey: ["admin-audit-log"], queryFn: () => fetchLog() });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Segurança e privacidade</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Como o Vem da Gente protege o acesso a esta área e os dados das pessoas.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              t: "Acesso por papel isolado",
              d: "Administradores ficam em uma tabela própria e protegida. Nenhum usuário pode se promover editando o próprio perfil.",
            },
            {
              t: "Verificação no servidor",
              d: "Toda ação da Administração revalida o token da sessão e o papel de administrador no servidor, não só na tela.",
            },
            {
              t: "Dados isolados por pessoa",
              d: "As regras do banco liberam cada registro apenas ao titular e a administradores. Visitantes não leem dados pessoais.",
            },
            {
              t: "Trilha de auditoria",
              d: "Concessão e revogação de acesso e mudanças de perfil ficam registradas e não podem ser apagadas.",
            },
            {
              t: "LGPD: direitos do titular",
              d: "Cada pessoa pode baixar seus dados e excluir a conta em Minha conta, a qualquer momento.",
            },
            {
              t: "Mínimo necessário",
              d: "Coletamos apenas o essencial para conectar doação e ajuda; a chave de serviço nunca é exposta ao navegador.",
            },
          ].map((item) => (
            <li key={item.t} className="card-ink bg-card p-4">
              <p className="font-semibold">{item.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.d}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold uppercase tracking-wide">Trilha de auditoria</h3>
        {log.isLoading && <Skeleton className="mt-4 h-32 w-full" />}
        {log.isSuccess && log.data.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma ação sensível registrada até agora.
          </p>
        )}
        <ul className="mt-3 space-y-2">
          {(log.data ?? []).map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="font-medium">{actionLabels[row.action] ?? row.action}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString("pt-BR")} · {row.entity}
                {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}…` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
