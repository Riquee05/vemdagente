import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  areaLabels,
  listVolunteerApplications,
  updateVolunteerApplicationStatus,
} from "@/lib/volunteers.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/admin/voluntarios")({
  component: AdminVoluntarios,
});

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  contacted: "Contactado",
  approved: "Aprovado",
  declined: "Recusado",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  contacted: "bg-blue-100 text-blue-900 border-blue-300",
  approved: "bg-green-100 text-green-900 border-green-300",
  declined: "bg-slate-100 text-slate-900 border-slate-300",
};

function AdminVoluntarios() {
  const queryClient = useQueryClient();
  const fetchList = useServerFn(listVolunteerApplications);
  const updateStatus = useServerFn(updateVolunteerApplicationStatus);
  const [filtro, setFiltro] = useState<"todos" | "pending" | "contacted" | "approved" | "declined">("todos");
  const [notaEdicao, setNotaEdicao] = useState<Record<string, string>>({});

  const applications = useQuery({
    queryKey: ["volunteer-applications"],
    queryFn: () => fetchList(),
  });

  const updater = useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      await updateStatus({
        data: {
          id: input.id,
          status: input.status as "pending" | "contacted" | "approved" | "declined",
          admin_notes: notaEdicao[input.id],
        },
      });
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      queryClient.invalidateQueries({ queryKey: ["volunteer-applications"] });
    },
    onError: () => toast.error("Não foi possível atualizar o status."),
  });

  const filtered = (applications.data ?? []).filter((app) => {
    if (filtro === "todos") return true;
    return app.status === filtro;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Inscrições de voluntários</h2>
        <div className="flex flex-wrap gap-2">
          {(["todos", "pending", "contacted", "approved", "declined"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFiltro(s)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                filtro === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground"
              }`}
            >
              {s === "todos" ? "Todos" : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {applications.isLoading && <Skeleton className="h-40 w-full" />}

      {applications.isSuccess && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma inscrição {filtro === "todos" ? "" : `com status "${statusLabels[filtro]}"`} encontrada.
        </p>
      )}

      <ul className="space-y-4">
        {filtered.map((app) => (
          <li key={app.id} className="card-ink bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{app.full_name}</h3>
                  <span
                    className={`rounded-none border px-2 py-0.5 text-xs font-bold uppercase ${
                      statusColors[app.status] ?? statusColors["pending"]
                    }`}
                  >
                    {statusLabels[app.status] ?? app.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-4" aria-hidden="true" />
                    <a href={`mailto:${app.email}`} className="underline hover:text-foreground">
                      {app.email}
                    </a>
                  </span>
                  {app.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-4" aria-hidden="true" />
                      <a
                        href={`https://wa.me/${app.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        {app.phone}
                      </a>
                    </span>
                  )}
                  {(app.city || app.state) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" aria-hidden="true" />
                      {[app.city, app.state].filter(Boolean).join(" / ")}
                    </span>
                  )}
                </div>

                {app.areas.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {app.areas.map((area) => (
                      <span
                        key={area}
                        className="border-2 border-foreground bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                      >
                        {areaLabels[area as keyof typeof areaLabels] ?? area}
                      </span>
                    ))}
                  </div>
                )}

                {app.motivation && (
                  <div className="mt-4 border-l-2 border-accent pl-3">
                    <p className="text-sm italic text-muted-foreground">"{app.motivation}"</p>
                  </div>
                )}

                {(app.experience || app.availability || app.heard_from) && (
                  <dl className="mt-4 grid gap-2 text-sm">
                    {app.availability && (
                      <div>
                        <dt className="font-semibold">Disponibilidade</dt>
                        <dd className="text-muted-foreground">{app.availability}</dd>
                      </div>
                    )}
                    {app.experience && (
                      <div>
                        <dt className="font-semibold">Experiência</dt>
                        <dd className="text-muted-foreground">{app.experience}</dd>
                      </div>
                    )}
                    {app.heard_from && (
                      <div>
                        <dt className="font-semibold">Como conheceu</dt>
                        <dd className="text-muted-foreground">{app.heard_from}</dd>
                      </div>
                    )}
                  </dl>
                )}

                <div className="mt-5 space-y-2">
                  <Label htmlFor={`notes-${app.id}`}>Anotações internas</Label>
                  <Input
                    id={`notes-${app.id}`}
                    value={notaEdicao[app.id] ?? app.admin_notes ?? ""}
                    onChange={(e) =>
                      setNotaEdicao((prev) => ({ ...prev, [app.id]: e.target.value }))
                    }
                    placeholder="Adicione uma nota..."
                    className="border-2 border-foreground bg-background"
                  />
                </div>
              </div>

              <div className="flex min-w-[12rem] flex-col gap-2">
                <span className="text-xs text-muted-foreground">
                  Enviada em {new Date(app.created_at).toLocaleDateString("pt-BR")}
                </span>
                <div className="flex flex-col gap-2">
                  {app.status !== "contacted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updater.mutate({ id: app.id, status: "contacted" })}
                      disabled={updater.isPending}
                    >
                      Marcar contactado
                    </Button>
                  )}
                  {app.status !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => updater.mutate({ id: app.id, status: "approved" })}
                      disabled={updater.isPending}
                    >
                      Aprovar
                    </Button>
                  )}
                  {app.status !== "declined" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updater.mutate({ id: app.id, status: "declined" })}
                      disabled={updater.isPending}
                    >
                      Recusar
                    </Button>
                  )}
                  {app.status !== "pending" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updater.mutate({ id: app.id, status: "pending" })}
                      disabled={updater.isPending}
                    >
                      Voltar para pendente
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
