import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, Phone, UserPlus } from "lucide-react";

import { AdminInvitePanel } from "@/components/admin/admin-invite-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { promoteApplicationToTeam } from "@/lib/team.functions";
import {
  areaLabels,
  listVolunteerApplications,
  listVolunteerStageEvents,
  updateVolunteerApplicationStatus,
  volunteerStageLabels,
  volunteerStages,
  type VolunteerStage,
} from "@/lib/volunteers.functions";

export const Route = createFileRoute("/_authenticated/admin/voluntarios")({
  component: AdminVoluntarios,
});

type Application = Awaited<ReturnType<typeof listVolunteerApplications>>[number];

const stageStyles: Record<VolunteerStage, string> = {
  pending: "border-accent",
  contacted: "border-primary",
  interview: "border-foreground",
  approved: "border-primary",
  declined: "border-border",
};

function areaLabel(area: string) {
  return areaLabels[area as keyof typeof areaLabels] ?? area;
}

function AdminVoluntarios() {
  const queryClient = useQueryClient();
  const fetchList = useServerFn(listVolunteerApplications);
  const updateStatus = useServerFn(updateVolunteerApplicationStatus);
  const promote = useServerFn(promoteApplicationToTeam);
  const fetchEvents = useServerFn(listVolunteerStageEvents);

  const [busca, setBusca] = useState("");
  const [areaFiltro, setAreaFiltro] = useState("todas");
  const [cidadeFiltro, setCidadeFiltro] = useState("todas");
  const [selecionado, setSelecionado] = useState<Application | null>(null);
  const [nota, setNota] = useState("");
  const [arrastando, setArrastando] = useState<string | null>(null);

  const applications = useQuery({
    queryKey: ["volunteer-applications"],
    queryFn: () => fetchList(),
  });

  const events = useQuery({
    queryKey: ["volunteer-stage-events", selecionado?.id],
    queryFn: () => fetchEvents({ data: { application_id: selecionado!.id } }),
    enabled: Boolean(selecionado?.id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["volunteer-applications"] });
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const mover = useMutation({
    mutationFn: (input: { id: string; status: VolunteerStage; admin_notes?: string }) =>
      updateStatus({ data: input }),
    onSuccess: () => {
      toast.success("Etapa atualizada.");
      invalidate();
      if (selecionado) {
        queryClient.invalidateQueries({ queryKey: ["volunteer-stage-events", selecionado.id] });
      }
    },
    onError: () => toast.error("Não foi possível atualizar a etapa."),
  });

  const promover = useMutation({
    mutationFn: (id: string) => promote({ data: { application_id: id } }),
    onSuccess: (result) => {
      toast.success(result.created ? "Adicionado ao time." : "Essa pessoa já está no time.");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível adicionar ao time."),
  });

  const cidades = useMemo(() => {
    const set = new Set<string>();
    (applications.data ?? []).forEach((a) => a.city && set.add(a.city));
    return Array.from(set).sort();
  }, [applications.data]);

  const filtradas = (applications.data ?? []).filter((app) => {
    const termo = busca.trim().toLowerCase();
    if (termo && !`${app.full_name} ${app.email}`.toLowerCase().includes(termo)) return false;
    if (areaFiltro !== "todas" && !(app.areas ?? []).includes(areaFiltro)) return false;
    if (cidadeFiltro !== "todas" && app.city !== cidadeFiltro) return false;
    return true;
  });

  const porEtapa = (stage: VolunteerStage) =>
    filtradas.filter((app) => (app.status as VolunteerStage) === stage);

  return (
    <div className="space-y-6">
      <div className="card-ink flex flex-wrap items-end gap-3 bg-surface p-4">
        <div className="space-y-1.5">
          <Label htmlFor="busca">Buscar</Label>
          <Input
            id="busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou e-mail"
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="area">Área</Label>
          <select
            id="area"
            value={areaFiltro}
            onChange={(e) => setAreaFiltro(e.target.value)}
            className="h-10 border-2 border-border bg-background px-3 text-sm"
          >
            <option value="todas">Todas as áreas</option>
            {Object.entries(areaLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cidade">Cidade</Label>
          <select
            id="cidade"
            value={cidadeFiltro}
            onChange={(e) => setCidadeFiltro(e.target.value)}
            className="h-10 border-2 border-border bg-background px-3 text-sm"
          >
            <option value="todas">Todas as cidades</option>
            {cidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <p className="ml-auto text-xs uppercase tracking-widest text-muted-foreground">
          {filtradas.length} candidatura(s)
        </p>
      </div>

      {applications.isLoading && <Skeleton className="h-72 w-full" />}

      {applications.isSuccess && (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {volunteerStages.map((stage) => (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastando) mover.mutate({ id: arrastando, status: stage });
                setArrastando(null);
              }}
              className={`min-h-40 border-2 border-dashed ${stageStyles[stage]} bg-surface/60 p-3`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm uppercase tracking-tight">
                  {volunteerStageLabels[stage]}
                </h3>
                <span className="text-xs font-semibold text-muted-foreground">
                  {porEtapa(stage).length}
                </span>
              </div>

              <ul className="mt-3 space-y-2">
                {porEtapa(stage).map((app) => (
                  <li key={app.id}>
                    <div
                      draggable
                      onDragStart={() => setArrastando(app.id)}
                      onDragEnd={() => setArrastando(null)}
                      className="card-ink cursor-grab bg-card p-3 active:cursor-grabbing"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          setSelecionado(app);
                          setNota(app.admin_notes ?? "");
                        }}
                      >
                        <p className="font-semibold leading-tight">{app.full_name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {app.city ?? "Cidade não informada"} ·{" "}
                          {new Date(app.created_at).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="mt-2 flex flex-wrap gap-1">
                          {(app.areas ?? []).slice(0, 3).map((area) => (
                            <span
                              key={area}
                              className="border border-border bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                            >
                              {areaLabel(area)}
                            </span>
                          ))}
                        </p>
                      </button>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {volunteerStages
                          .filter((s) => s !== stage)
                          .map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => mover.mutate({ id: app.id, status: s })}
                              className="border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide hover:bg-secondary"
                            >
                              {volunteerStageLabels[s]}
                            </button>
                          ))}
                      </div>

                      {stage === "approved" && (
                        <>
                          <Button
                            size="sm"
                            className="mt-2 w-full"
                            disabled={promover.isPending}
                            onClick={() => promover.mutate(app.id)}
                          >
                            <UserPlus className="size-3.5" /> Adicionar ao time
                          </Button>
                          <AdminInvitePanel applicationId={app.id} email={app.email} />
                        </>
                      )}
                    </div>
                  </li>
                ))}
                {porEtapa(stage).length === 0 && (
                  <li className="text-xs text-muted-foreground">Nenhuma candidatura aqui.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Sheet open={Boolean(selecionado)} onOpenChange={(open) => !open && setSelecionado(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selecionado && (
            <div className="space-y-5">
              <SheetTitle className="font-display text-xl">{selecionado.full_name}</SheetTitle>

              <div className="space-y-1 text-sm">
                <p className="inline-flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <a href={`mailto:${selecionado.email}`} className="underline">
                    {selecionado.email}
                  </a>
                </p>
                {selecionado.phone && (
                  <p className="inline-flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <a
                      href={`https://wa.me/55${selecionado.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {selecionado.phone} (WhatsApp)
                    </a>
                  </p>
                )}
                {(selecionado.city || selecionado.state) && (
                  <p className="inline-flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    {[selecionado.city, selecionado.state].filter(Boolean).join(" / ")}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Áreas de interesse
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(selecionado.areas ?? []).map((area) => (
                    <span key={area} className="border-2 border-border bg-secondary px-2 py-0.5 text-xs">
                      {areaLabel(area)}
                    </span>
                  ))}
                </div>
              </div>

              {selecionado.availability && (
                <Field label="Disponibilidade" value={selecionado.availability} />
              )}
              {selecionado.experience && <Field label="Experiência" value={selecionado.experience} />}
              {selecionado.motivation && <Field label="Motivação" value={selecionado.motivation} />}
              {selecionado.heard_from && <Field label="Como conheceu" value={selecionado.heard_from} />}

              <div className="space-y-2">
                <Label htmlFor="nota">Notas internas</Label>
                <Textarea id="nota" value={nota} onChange={(e) => setNota(e.target.value)} rows={4} />
                <Button
                  size="sm"
                  onClick={() =>
                    mover.mutate({
                      id: selecionado.id,
                      status: selecionado.status as VolunteerStage,
                      admin_notes: nota,
                    })
                  }
                  disabled={mover.isPending}
                >
                  Salvar nota
                </Button>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Histórico de etapas
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {(events.data ?? []).map((ev) => (
                    <li key={ev.id} className="text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("pt-BR")} —{" "}
                      {ev.from_status
                        ? volunteerStageLabels[ev.from_status as VolunteerStage] ?? ev.from_status
                        : "Início"}{" "}
                      → {volunteerStageLabels[ev.to_status as VolunteerStage] ?? ev.to_status}
                    </li>
                  ))}
                  {(events.data ?? []).length === 0 && (
                    <li className="text-muted-foreground">Sem mudanças registradas.</li>
                  )}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                {volunteerStages.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selecionado.status === s ? "default" : "outline"}
                    onClick={() => {
                      mover.mutate({ id: selecionado.id, status: s });
                      setSelecionado({ ...selecionado, status: s });
                    }}
                  >
                    {volunteerStageLabels[s]}
                  </Button>
                ))}
              </div>

              <Button className="w-full" onClick={() => promover.mutate(selecionado.id)}>
                <UserPlus className="size-4" /> Adicionar ao time
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm whitespace-pre-line">{value}</p>
    </div>
  );
}
