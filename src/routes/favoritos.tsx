import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useFavorites } from "@/hooks/use-favorites";
import { fetchVerifiedPointsPage, fetchActiveNeedsByPointIds } from "@/lib/points";
import { PageShell } from "@/components/layout/page-shell";
import { PointCard } from "@/components/points/point-card";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [{ title: "Meus favoritos | Vem da Gente" }, { name: "robots", content: "noindex" }],
  }),
  component: FavoritesPage,
});
function FavoritesPage() {
  const { ids, clear } = useFavorites();
  const [storageError, setStorageError] = useState("");
  const [page, setPage] = useState(1);
  const points = useQuery({
    queryKey: ["favorite-points", ids, page],
    queryFn: ({ signal }) =>
      fetchVerifiedPointsPage({ city: "", causeId: "all", page, favoriteIds: ids, signal }),
  });
  const list = points.data?.points ?? [];
  const pointIds = list.map((point) => point.id);
  const needs = useQuery({
    staleTime: 60000,
    queryKey: ["point-needs", pointIds],
    queryFn: () => fetchActiveNeedsByPointIds(pointIds),
    enabled: pointIds.length > 0,
  });
  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-4xl">Meus favoritos</h1>
        <p className="mt-4 text-muted-foreground">
          Salvos apenas neste navegador, sem conta. Limpar os dados do navegador remove a lista.
          Cadastros retirados do público não aparecem aqui.
        </p>
        {ids.length ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              try {
                clear();
                setPage(1);
                setStorageError("");
              } catch (error) {
                setStorageError(
                  error instanceof Error ? error.message : "Não foi possível limpar.",
                );
              }
            }}
          >
            Limpar todos os favoritos
          </Button>
        ) : null}
        {storageError ? <p role="alert">{storageError}</p> : null}
        <Link to="/pontos" className="mt-4 inline-block underline">
          Explorar instituições
        </Link>
        {points.isPending ? (
          <p role="status">Carregando favoritos…</p>
        ) : points.isError ? (
          <div role="alert">
            <p>Não foi possível carregar os favoritos. Sua lista salva foi preservada.</p>
            <Button onClick={() => points.refetch()}>Tentar novamente</Button>
          </div>
        ) : !list.length ? (
          <div className="mt-6">
            <p>
              {page > 1
                ? "Não há favoritos nesta página."
                : "Nenhuma instituição publicada nos seus favoritos. Toque em Salvar nos cartões para começar."}
            </p>
            {page > 1 ? <Button onClick={() => setPage(1)}>Voltar à primeira página</Button> : null}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {list.map((point) => (
              <PointCard
                key={point.id}
                point={point}
                needs={(needs.data ?? []).filter((need) => need.point_id === point.id)}
              />
            ))}
          </div>
        )}
        {needs.isError ? (
          <p role="alert">
            Não foi possível consultar as necessidades. Confirme com a instituição.
          </p>
        ) : null}
        {points.data && points.data.total > 30 ? (
          <nav className="mt-6 flex gap-3" aria-label="Páginas dos favoritos">
            <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span>Página {page}</span>
            <Button disabled={page * 30 >= points.data.total} onClick={() => setPage(page + 1)}>
              Próxima
            </Button>
          </nav>
        ) : null}
      </section>
    </PageShell>
  );
}
