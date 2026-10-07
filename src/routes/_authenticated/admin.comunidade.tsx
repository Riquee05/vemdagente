import { readInstitutionProposal } from "@/lib/institution-workspace";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listCommunityReview, reviewCommunitySubmission } from "@/lib/community.functions";
export const Route = createFileRoute("/_authenticated/admin/comunidade")({
  component: CommunityReview,
});
function CommunityReview() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [page, setPage] = useState(1);
  const queue = useQuery({
    queryKey: ["community-review", status, page],
    queryFn: () => listCommunityReview({ data: { status, page } }),
  });
  const review = useMutation({
    mutationFn: (data: {
      id: string;
      kind: "testimonial" | "claim" | "correction";
      status: "approved" | "rejected";
    }) => reviewCommunitySubmission({ data }),
    onSuccess: () => {
      toast.success("Revisão salva.");
      void queryClient.invalidateQueries({ queryKey: ["community-review"] });
      void queryClient.invalidateQueries({ queryKey: ["published-testimonials"] });
      void queryClient.invalidateQueries({ queryKey: ["verified-points"] });
      void queryClient.invalidateQueries({ queryKey: ["project-health"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Relatos e acesso das instituições</h2>
      <p className="text-sm text-muted-foreground">
        Leia cada relato e confira informações pessoais antes de publicar. Avaliações positivas e
        negativas seguem a mesma revisão. Para liberar acesso a uma ONG, confirme a identidade e o
        vínculo por um canal oficial; aprovar dá acesso à gestão das necessidades dessa instituição.
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pending", "Aguardando"],
            ["approved", "Aprovados"],
            ["rejected", "Recusados"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={status === value ? "default" : "outline"}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {queue.isPending && <p role="status">Carregando revisão…</p>}
      {queue.isError && (
        <div role="alert">
          Não foi possível carregar a fila.{" "}
          <Button onClick={() => void queue.refetch()}>Tentar novamente</Button>
        </div>
      )}
      {queue.data && (
        <>
          <h3 className="text-lg font-semibold">Relatos</h3>
          {!queue.data.stories.length && <p>Nenhum relato nesta página.</p>}
          {queue.data.stories.map((item) => (
            <article key={item.id} className="rounded-xl border border-border p-5">
              <p className="font-semibold">
                {item.display_name} · {item.rating}/5{item.city ? ` · ${item.city}` : ""}
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words">{item.story}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Autorização registrada em {new Date(item.consent_at).toLocaleDateString("pt-BR")}
              </p>
              <div className="mt-4 flex gap-2">
                {item.status !== "approved" && (
                  <Button
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate({ id: item.id, kind: "testimonial", status: "approved" })
                    }
                  >
                    Aprovar e publicar
                  </Button>
                )}
                {item.status !== "rejected" && (
                  <Button
                    variant="destructive"
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate({ id: item.id, kind: "testimonial", status: "rejected" })
                    }
                  >
                    {item.status === "approved" ? "Retirar do site" : "Recusar"}
                  </Button>
                )}
              </div>
            </article>
          ))}
          <h3 className="text-lg font-semibold">Pedidos de acesso a instituições</h3>
          {!queue.data.claims.length && <p>Nenhuma solicitação nesta página.</p>}
          {queue.data.claims.map((item) => (
            <article key={item.id} className="rounded-xl border border-border p-5">
              <Button asChild variant="outline">
                <Link to="/pontos/$pointId" params={{ pointId: item.point_id }}>
                  Ver instituição
                </Link>
              </Button>
              <p className="mt-3 break-words">Contato: {item.contact}</p>
              <p className="mt-2 whitespace-pre-wrap break-words">{item.message}</p>
              {status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate({ id: item.id, kind: "claim", status: "approved" })
                    }
                  >
                    Confirmar vínculo e liberar acesso
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate({ id: item.id, kind: "claim", status: "rejected" })
                    }
                  >
                    Recusar
                  </Button>
                </div>
              )}
            </article>
          ))}
          <h3 className="text-lg font-semibold">Sugestões de correção</h3>
          <p className="text-sm text-muted-foreground">
            Confira a sugestão e atualize o cadastro em Pontos antes de marcar como corrigida. Esta
            revisão não aplica alterações automaticamente.
          </p>
          {!queue.data.corrections.length && <p>Nenhuma sugestão nesta página.</p>}
          {queue.data.corrections.map((item) => (
            <article key={item.id} className="rounded-xl border border-border p-5">
              <Button asChild variant="outline">
                <Link to="/pontos/$pointId" params={{ pointId: item.point_id }}>
                  Ver instituição
                </Link>
              </Button>
              {readInstitutionProposal(item.message) ? (
                <div className="mt-3 space-y-2">
                  <p className="font-semibold">Atualização proposta pelo responsável</p>
                  <dl>
                    {Object.entries(readInstitutionProposal(item.message)!.patch).map(
                      ([field, value]) => (
                        <div key={field}>
                          <dt className="font-medium">
                            {{
                              name: "Nome",
                              phone: "Telefone",
                              whatsapp: "WhatsApp",
                              website: "Site",
                              opening_hours: "Funcionamento",
                              donation_hours: "Doações",
                              description: "Apresentação",
                            }[field as "name"] ?? field}
                          </dt>
                          <dd className="whitespace-pre-wrap break-words">
                            {value || "Não informado"}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>
                  <p className="text-xs">
                    A aprovação aplica estes campos à ficha. Se a ficha mudou desde o envio, a
                    proposta será bloqueada.
                  </p>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-wrap break-words">{item.message}</p>
              )}
              {item.contact && <p className="mt-2 text-sm">Contato: {item.contact}</p>}
              {status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate({ id: item.id, kind: "correction", status: "approved" })
                    }
                  >
                    {readInstitutionProposal(item.message)
                      ? "Aprovar e atualizar ficha"
                      : "Marcar corrigida"}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate({ id: item.id, kind: "correction", status: "rejected" })
                    }
                  >
                    Recusar
                  </Button>
                </div>
              )}
            </article>
          ))}
          {queue.data.total > 20 && (
            <nav aria-label="Páginas de revisão" className="flex gap-3">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span>Página {page}</span>
              <Button disabled={page * 20 >= queue.data.total} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
