import { TerritoryCounts } from "@/components/admin/point-territory";
import { ProjectHealth } from "@/components/admin/project-health";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminOverview } from "@/lib/team.functions";
import { volunteerStageLabels, volunteerStages } from "@/lib/volunteers.functions";

export const Route = createFileRoute("/_authenticated/admin/visao-geral")({
  component: AdminVisaoGeral,
});

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card-ink bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function AdminVisaoGeral() {
  const fetchOverview = useServerFn(getAdminOverview);
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview() });

  if (overview.isLoading) return <Skeleton className="h-72 w-full" />;
  if (overview.isError)
    return <p className="text-sm text-destructive">Não foi possível carregar os números.</p>;

  const data = overview.data!;

  return (
    <div className="space-y-10">
      <ProjectHealth />
      <TerritoryCounts />
      <section>
        <h2 className="font-display text-xl uppercase tracking-tight">Pontos e redes</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Aprovados no mapa" value={data.points.verified} tone="text-primary" />
          <Stat label="Aguardando curadoria" value={data.points.pending} tone="text-accent" />
          <Stat label="Recusados" value={data.points.rejected} />
          <Stat label="Inativos" value={data.points.inactive} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl uppercase tracking-tight">Pedidos de ajuda</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total recebidos" value={data.helpRequests.total} />
          <Stat label="Em aberto" value={data.helpRequests.open} tone="text-accent" />
        </div>
        <Link
          to="/admin/pedidos"
          className="mt-3 inline-block font-semibold text-primary underline"
        >
          Abrir pedidos de ajuda
        </Link>
      </section>

      <section>
        <h2 className="font-display text-xl uppercase tracking-tight">Voluntários no pipeline</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {volunteerStages.map((stage) => (
            <Stat
              key={stage}
              label={volunteerStageLabels[stage]}
              value={data.volunteers[stage] ?? 0}
            />
          ))}
        </div>
        <Link
          to="/admin/voluntarios"
          className="mt-3 inline-block text-sm font-semibold text-primary underline"
        >
          Abrir pipeline de candidaturas
        </Link>
      </section>

      <section>
        <h2 className="font-display text-xl uppercase tracking-tight">Time</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Colaboradores ativos" value={data.team.active} tone="text-primary" />
          <Stat label="Total no time" value={data.team.total} />
        </div>
        <Link
          to="/admin/time"
          className="mt-3 inline-block text-sm font-semibold text-primary underline"
        >
          Ver o time
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card-ink bg-surface p-5">
          <h3 className="font-display text-lg uppercase tracking-tight">Últimos pontos</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentPoints.length === 0 && (
              <li className="text-muted-foreground">Nada ainda.</li>
            )}
            {data.recentPoints.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 border-b border-border/60 pb-2">
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {p.city} · {p.curation_status}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-ink bg-surface p-5">
          <h3 className="font-display text-lg uppercase tracking-tight">Últimas candidaturas</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentApplications.length === 0 && (
              <li className="text-muted-foreground">Nenhuma candidatura ainda.</li>
            )}
            {data.recentApplications.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 border-b border-border/60 pb-2">
                <span className="truncate">{a.full_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a.city ?? "—"} ·{" "}
                  {volunteerStageLabels[a.status as keyof typeof volunteerStageLabels] ?? a.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
