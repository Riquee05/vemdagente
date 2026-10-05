import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, HandHeart, MapPinned, Settings2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { PointNeedsEditor } from "@/components/points/point-needs-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCollaboratorOverview,
  listAssignedHelpRequests,
  listCollaboratorNeedsPoints,
  listCollaboratorPoints,
  listInstitutionalContent,
  listVolunteerWorkspace,
  updateAssignedHelpRequest,
} from "@/lib/collaborator.functions";
import type { TeamPermission } from "@/lib/collaborator-authorization";

export const Route = createFileRoute("/_authenticated/colaborador")({
  head: () => ({ meta: [
    { title: "Painel do Colaborador | Vem da Gente" },
    { name: "description", content: "Área de trabalho autorizada dos colaboradores do Vem da Gente." },
    { property: "og:title", content: "Painel do Colaborador | Vem da Gente" },
    { property: "og:description", content: "Área de trabalho autorizada dos colaboradores do Vem da Gente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CollaboratorPage,
});

const modules: Array<{ permission: TeamPermission; label: string; icon: typeof MapPinned }> = [
  { permission: "points_review", label: "Curadoria de pontos", icon: MapPinned },
  { permission: "needs_management", label: "Necessidades", icon: HandHeart },
  { permission: "volunteer_management", label: "Voluntários e equipe", icon: Users },
  { permission: "help_support", label: "Atendimentos", icon: ClipboardList },
  { permission: "content_management", label: "Conteúdo institucional", icon: Settings2 },
];

function CollaboratorPage() {
  const getOverview = useServerFn(getCollaboratorOverview);
  const overview = useQuery({ queryKey: ["collaborator-overview"], queryFn: () => getOverview() });
  const available = modules.filter((item) => overview.data?.member.permissions.includes(item.permission));
  const [active, setActive] = useState<TeamPermission | null>(null);
  const selected = active && available.some((item) => item.permission === active) ? active : available[0]?.permission;

  return <PageShell><section className="mx-auto w-full max-w-6xl px-4 py-10">
    <p className="text-xs font-semibold uppercase tracking-widest text-accent">Área do colaborador</p>
    {overview.isLoading ? <Skeleton className="mt-4 h-36 w-full" /> : null}
    {overview.isError ? <div className="card-ink mt-6 max-w-xl p-6"><h1 className="font-display text-2xl">Acesso indisponível</h1><p className="mt-2 text-sm text-muted-foreground">{overview.error instanceof Error ? overview.error.message : "Procure o responsável pelo projeto."}</p><Button asChild variant="outline" className="mt-4"><Link to="/minha-conta">Minha conta</Link></Button></div> : null}
    {overview.data ? <>
      <div className="mt-3 border-b-2 border-foreground pb-6"><h1 className="font-display text-3xl">Olá, {overview.data.member.full_name}</h1><p className="mt-1 text-sm text-muted-foreground">{overview.data.member.role_title} · status ativo</p>{overview.data.member.areas.length ? <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Áreas: {overview.data.member.areas.join(", ")}</p> : null}</div>
      {available.length === 0 ? <div className="card-ink mt-8 max-w-xl p-6"><h2 className="font-display text-xl">Nenhuma atividade liberada</h2><p className="mt-2 text-sm text-muted-foreground">Procure o responsável para definir suas permissões.</p></div> : <>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Módulos do colaborador">{available.map(({ permission, label, icon: Icon }) => <Button key={permission} variant={selected === permission ? "default" : "outline"} onClick={() => setActive(permission)}><Icon className="size-4" />{label}</Button>)}</nav>
        <div className="mt-8">{selected === "points_review" && <PointsModule />}{selected === "needs_management" && <NeedsModule />}{selected === "volunteer_management" && <VolunteersModule />}{selected === "help_support" && <HelpModule />}{selected === "content_management" && <ContentModule />}</div>
      </>}
    </> : null}
  </section></PageShell>;
}

function PointsModule() {
  const fetcher = useServerFn(listCollaboratorPoints);
  const query = useQuery({ queryKey: ["collaborator-points"], queryFn: () => fetcher() });
  if (query.isLoading) return <Skeleton className="h-36 w-full" />;
  return <div className="space-y-6"><section><h2 className="font-display text-xl">Pontos aguardando curadoria</h2><ul className="mt-3 grid gap-3 md:grid-cols-2">{query.data?.points.map((point) => <li key={point.id} className="card-ink p-4"><p className="font-semibold">{point.name}</p><p className="mt-1 text-sm text-muted-foreground">{point.address || `${point.city}, ${point.state}`}</p><p className="mt-2 text-xs uppercase tracking-wide">Origem: {point.source}</p></li>)}</ul>{query.data?.points.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhum ponto pendente.</p> : null}</section><section><h2 className="font-display text-xl">Sugestões de correção</h2><ul className="mt-3 space-y-2">{query.data?.corrections.map((item) => <li key={item.id} className="card-ink p-4 text-sm">{item.message}</li>)}</ul>{query.data?.corrections.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma sugestão pendente.</p> : null}</section></div>;
}

function NeedsModule() {
  const fetcher = useServerFn(listCollaboratorNeedsPoints);
  const query = useQuery({ queryKey: ["collaborator-needs-points"], queryFn: () => fetcher() });
  const [pointId, setPointId] = useState<string | null>(null);
  if (query.isLoading) return <Skeleton className="h-36 w-full" />;
  return <div><h2 className="font-display text-xl">Necessidades dos pontos</h2><div className="mt-4 grid gap-5 md:grid-cols-[280px_1fr]"><div className="space-y-2">{query.data?.map((point) => <Button key={point.id} variant={pointId === point.id ? "default" : "outline"} className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => setPointId(point.id)}>{point.name}</Button>)}</div><div>{pointId ? <PointNeedsEditor pointId={pointId} /> : <p className="text-sm text-muted-foreground">Escolha um ponto para atualizar suas necessidades.</p>}</div></div></div>;
}

function HelpModule() {
  const queryClient = useQueryClient();
  const fetcher = useServerFn(listAssignedHelpRequests);
  const updater = useServerFn(updateAssignedHelpRequest);
  const query = useQuery({ queryKey: ["collaborator-help"], queryFn: () => fetcher() });
  const mutation = useMutation({ mutationFn: (input: { id: string; status: "open" | "in_progress" | "closed" }) => updater({ data: input }), onSuccess: () => { toast.success("Atendimento atualizado."); queryClient.invalidateQueries({ queryKey: ["collaborator-help"] }); }, onError: (error: Error) => toast.error(error.message) });
  if (query.isLoading) return <Skeleton className="h-36 w-full" />;
  return <div><h2 className="font-display text-xl">Atendimentos atribuídos a você</h2><ul className="mt-4 space-y-3">{query.data?.map((item) => <li key={item.id} className="card-ink p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{item.item_categories?.label ?? "Pedido de ajuda"}</p><p className="mt-1 text-sm text-muted-foreground">{item.city}</p>{item.note ? <p className="mt-3 text-sm">{item.note}</p> : null}</div><select value={item.status} aria-label="Status do atendimento" className="h-9 border-2 border-border bg-background px-2 text-sm" onChange={(event) => mutation.mutate({ id: item.id, status: event.target.value as "open" | "in_progress" | "closed" })}><option value="open">Aberto</option><option value="in_progress">Em atendimento</option><option value="closed">Concluído</option></select></div></li>)}</ul>{query.data?.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhum atendimento foi atribuído a você.</p> : null}</div>;
}

function VolunteersModule() {
  const fetcher = useServerFn(listVolunteerWorkspace);
  const query = useQuery({ queryKey: ["collaborator-volunteers"], queryFn: () => fetcher() });
  if (query.isLoading) return <Skeleton className="h-36 w-full" />;
  return <div className="grid gap-8 lg:grid-cols-2"><section><h2 className="font-display text-xl">Candidaturas</h2><ul className="mt-3 space-y-2">{query.data?.applications.map((item) => <li key={item.id} className="card-ink p-4"><p className="font-semibold">{item.full_name}</p><p className="text-sm text-muted-foreground">{item.city}, {item.state} · {item.status}</p></li>)}</ul></section><section><h2 className="font-display text-xl">Equipe</h2><ul className="mt-3 space-y-2">{query.data?.team.map((item) => <li key={item.id} className="card-ink p-4"><p className="font-semibold">{item.full_name}</p><p className="text-sm text-muted-foreground">{item.role_title} · {item.status}</p></li>)}</ul></section></div>;
}

function ContentModule() {
  const fetcher = useServerFn(listInstitutionalContent);
  const query = useQuery({ queryKey: ["collaborator-content"], queryFn: () => fetcher() });
  if (query.isLoading) return <Skeleton className="h-36 w-full" />;
  return <div><h2 className="font-display text-xl">Conteúdo institucional</h2><p className="mt-1 text-sm text-muted-foreground">Conteúdo disponível para acompanhamento.</p><dl className="mt-4 space-y-3">{query.data?.map((item) => <div key={item.key} className="card-ink p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.key}</dt><dd className="mt-2 whitespace-pre-wrap text-sm">{item.value}</dd></div>)}</dl></div>;
}
