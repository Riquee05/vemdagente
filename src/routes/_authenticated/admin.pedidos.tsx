import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { HelpRequestLocation } from "@/components/admin/help-request-location";
import { Button } from "@/components/ui/button";
import {
  helpStatusLabels,
  listAdminHelpRequests,
  updateAdminHelpRequest,
} from "@/lib/admin-help-requests.functions";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({ component: HelpRequests });
type Status = keyof typeof helpStatusLabels;
function HelpRequests() {
  const [status, setStatus] = useState<Status | "all">("open");
  const [page, setPage] = useState(1);
  const fetchRequests = useServerFn(listAdminHelpRequests);
  const save = useServerFn(updateAdminHelpRequest);
  const client = useQueryClient();
  const requests = useQuery({
    queryKey: ["admin-help-requests", status, page],
    queryFn: () => fetchRequests({ data: { status, page } }),
  });
  const update = useMutation({
    mutationFn: (data: { id: string; status: Status; previousStatus: Status }) => save({ data }),
    onSuccess: () => {
      toast.success("Status do pedido atualizado.");
      void client.invalidateQueries({ queryKey: ["admin-help-requests"] });
      void client.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      void requests.refetch();
    },
  });
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Pedidos de ajuda</h2>
      <p className="text-sm text-muted-foreground">
        Solicitações privadas para acompanhamento da equipe. Marque como resolvido somente após
        confirmar o resultado; encerrar não significa que houve atendimento.
      </p>
      <div className="space-y-2">
        <label htmlFor="help-status" className="block font-medium">
          Filtrar por status
        </label>
        <select
          id="help-status"
          className="rounded border-2 border-border bg-background p-2"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as Status | "all");
            setPage(1);
          }}
        >
          <option value="all">Todos</option>
          {Object.entries(helpStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {requests.isPending && <p role="status">Carregando pedidos…</p>}
      {requests.isError && (
        <div role="alert">
          Não foi possível carregar os pedidos.{" "}
          <Button variant="outline" onClick={() => void requests.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {requests.data && (
        <>
          <p role="status">{requests.data.total} pedido(s) neste filtro.</p>
          {!requests.data.rows.length && <p>Nenhum pedido nesta página.</p>}
          <ul className="space-y-4">
            {requests.data.rows.map((item) => (
              <li key={item.id} className="rounded-xl border border-border p-5">
                <h3 className="font-semibold">
                  {item.item_categories?.label ?? "Ajuda"} · {item.city}
                </h3>
                <p className="mt-2 text-sm">
                  {helpStatusLabels[item.status as Status] ?? item.status} · Recebido em{" "}
                  {new Date(item.created_at).toLocaleString("pt-BR")}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer font-medium">Ver detalhes do pedido</summary>
                  <p className="mt-3 whitespace-pre-wrap break-words">
                    {item.note || "Sem descrição adicional."}
                  </p>
                  <p className="mt-2 text-sm">
                    {item.requester_id
                      ? "Enviado por usuário com conta."
                      : "Enviado sem conta; não há contato cadastrado neste pedido."}
                  </p>
                  <HelpRequestLocation
                    id={item.id}
                    lat={item.lat}
                    lng={item.lng}
                    city={item.city}
                  />
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    Identificador: {item.id}
                  </p>
                </details>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(Object.keys(helpStatusLabels) as Status[])
                    .filter((value) => value !== item.status)
                    .map((value) => (
                      <Button
                        key={value}
                        variant="outline"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: item.id,
                            status: value,
                            previousStatus: item.status as Status,
                          })
                        }
                      >
                        {value === "open"
                          ? "Reabrir"
                          : value === "resolved"
                            ? "Marcar resolvido"
                            : "Encerrar"}
                      </Button>
                    ))}
                </div>
              </li>
            ))}
          </ul>
          {requests.data.total > 20 && (
            <nav aria-label="Páginas de pedidos" className="flex items-center gap-3">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span>Página {page}</span>
              <Button disabled={page * 20 >= requests.data.total} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
