import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDuplicateAlerts, getPointHistory } from "@/lib/curation-insights.functions";
import { Button } from "@/components/ui/button";
export function DuplicateAlerts() {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["duplicate-alerts"],
    queryFn: () => getDuplicateAlerts(),
    enabled: open,
    staleTime: 60000,
  });
  return (
    <details className="rounded-lg border p-4" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">
        Conferir possíveis cadastros duplicados
      </summary>
      <p className="mt-3">
        Mesmo endereço ou telefone pode atender instituições diferentes. Confira os registros antes
        de aprovar; nenhum cadastro será unido automaticamente.
      </p>
      {open && query.isPending && <p role="status">Conferindo…</p>}
      {query.isError && <p role="alert">{query.error.message}</p>}
      {query.data?.limited && (
        <p role="status">Análise limitada aos primeiros 10 mil cadastros de São Paulo.</p>
      )}
      {query.data?.groups.length === 0 && <p>Nenhuma coincidência encontrada.</p>}
      {query.data?.groups.map((group) => (
        <div key={group.reason} className="mt-4 border-t pt-3">
          <p className="break-words font-medium">{group.reason}</p>
          <ul>
            {group.points.map((point) => (
              <li key={point.id}>
                {point.name} — {point.city}
                <a
                  className="ml-2 underline"
                  href={`/pontos/${point.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Conferir ficha de {point.name} (nova aba)
                </a>
                <p className="break-all text-xs">ID: {point.id}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Button className="mt-3" onClick={() => void query.refetch()}>
        Conferir novamente
      </Button>
    </details>
  );
}
export function PointHistory({ pointId }: { pointId: string }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["point-history", pointId],
    queryFn: () => getPointHistory({ data: { point_id: pointId } }),
    enabled: open,
  });
  return (
    <details className="mt-4 rounded-lg border p-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">
        Histórico de alterações desta ficha
      </summary>
      <p className="text-sm">Até 50 alterações recentes, registradas após ativação da migração.</p>
      {open && query.isPending && <p role="status">Carregando…</p>}
      {query.isError && <p role="alert">{query.error.message}</p>}
      {query.data?.length === 0 && <p>Nenhuma alteração registrada.</p>}
      {query.data?.map((row) => (
        <div key={row.id} className="mt-3 border-t pt-3">
          <p>
            {new Date(row.changed_at).toLocaleString("pt-BR")} — {row.actor}
          </p>
          <dl>
            {Object.entries(row.changes as Record<string, { before: unknown; after: unknown }>).map(
              ([field, value]) => (
                <div key={field} className="mt-2 break-words">
                  <dt className="font-medium">{field}</dt>
                  <dd>Antes: {String(value.before ?? "Não informado")}</dd>
                  <dd>Depois: {String(value.after ?? "Não informado")}</dd>
                </div>
              ),
            )}
          </dl>
        </div>
      ))}
    </details>
  );
}
