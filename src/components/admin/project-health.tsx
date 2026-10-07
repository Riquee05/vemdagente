import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProjectHealth } from "@/lib/institution-workspace.functions";
import { Button } from "@/components/ui/button";
export function ProjectHealth() {
  const get = useServerFn(getProjectHealth);
  const health = useQuery({ queryKey: ["project-health"], queryFn: () => get(), staleTime: 60000 });
  const rows = [
    ["contact", "Instituições sem canal de contato", "/admin"],
    ["stale", "Confirmações para revisar", "/admin/curadoria"],
    ["corrections", "Correções e propostas pendentes", "/admin/comunidade"],
    ["expired", "Necessidades ativas com prazo vencido", "/admin/necessidades"],
    ["claims", "Vínculos aguardando aprovação", "/admin/comunidade"],
  ] as const;
  return (
    <section className="rounded border border-border bg-card p-5">
      <h2 className="text-xl font-semibold">Saúde das informações</h2>
      {health.isPending ? (
        <p role="status">Atualizando indicadores…</p>
      ) : health.isError ? (
        <div role="alert">
          <p>{health.error.message}</p>
          <Button onClick={() => health.refetch()}>Tentar novamente</Button>
        </div>
      ) : health.data ? (
        <>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {rows.map(([field, label, to]) => (
              <div key={field} className="rounded border border-border p-3">
                <dt>
                  <Link to={to} className="underline">
                    {label}
                  </Link>
                </dt>
                <dd className="mt-2 text-2xl font-semibold">{health.data[field]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Atualizado em {new Date(health.data.checked_at).toLocaleString("pt-BR")}. Necessidades
            vencidas já ficam ocultas no público; o indicador ajuda a revisar ou encerrar registros
            internos.
          </p>
          <Button className="mt-3" variant="outline" onClick={() => health.refetch()}>
            Atualizar indicadores
          </Button>
        </>
      ) : null}
    </section>
  );
}
