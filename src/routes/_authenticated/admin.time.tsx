import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Clipboard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createTeamMember,
  listTeamMembers,
  removeTeamMember,
  teamStatusLabels,
  teamStatuses,
  updateTeamMember,
  updateTeamMemberPermissions,
} from "@/lib/team.functions";
import { teamPermissions, type TeamPermission } from "@/lib/collaborator-authorization";
import { createTeamInvite, listTeamInvites, revokeTeamInvite } from "@/lib/team-invites.functions";

export const Route = createFileRoute("/_authenticated/admin/time")({
  component: AdminTime,
});

const statusStyles: Record<string, string> = {
  active: "border-primary bg-primary/15 text-primary",
  paused: "border-accent bg-accent/15 text-accent",
  inactive: "border-border bg-muted text-muted-foreground",
};

const permissionLabels: Record<TeamPermission, string> = {
  points_review: "Curadoria de pontos",
  needs_management: "Necessidades",
  volunteer_management: "Voluntários e equipe",
  help_support: "Atendimentos com dados pessoais",
  content_management: "Conteúdo institucional",
};

type TeamInviteSummary = {
  id: string;
  email: string;
  status: string;
  attempts: number;
  expires_at: string;
};

function AdminTime() {
  const queryClient = useQueryClient();
  const fetchTeam = useServerFn(listTeamMembers);
  const create = useServerFn(createTeamMember);
  const update = useServerFn(updateTeamMember);
  const remove = useServerFn(removeTeamMember);
  const updatePermissions = useServerFn(updateTeamMemberPermissions);
  const fetchInvites = useServerFn(listTeamInvites);
  const generateInvite = useServerFn(createTeamInvite);
  const cancelInvite = useServerFn(revokeTeamInvite);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role_title: "Voluntário",
    city: "",
  });
  const [filtro, setFiltro] = useState<"todos" | (typeof teamStatuses)[number]>("todos");
  const [revealedInvite, setRevealedInvite] = useState<{
    email: string;
    password: string;
    expires_at: string;
  } | null>(null);

  const team = useQuery({ queryKey: ["team-members"], queryFn: () => fetchTeam() });
  const invites = useQuery({
    queryKey: ["team-invites"],
    queryFn: async () => (await fetchInvites()) as TeamInviteSummary[],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["team-members"] });
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    queryClient.invalidateQueries({ queryKey: ["team-invites"] });
  };

  const creator = useMutation({
    mutationFn: () =>
      create({
        data: {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          role_title: form.role_title.trim() || "Voluntário",
          city: form.city.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Pessoa adicionada ao time.");
      setForm({ full_name: "", email: "", phone: "", role_title: "Voluntário", city: "" });
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível adicionar."),
  });

  const updater = useMutation({
    mutationFn: (input: {
      id: string;
      status?: (typeof teamStatuses)[number];
      role_title?: string;
    }) => update({ data: input }),
    onSuccess: () => {
      toast.success("Time atualizado.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível atualizar."),
  });

  const remover = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido do time.");
      invalidate();
    },
    onError: () => toast.error("Não foi possível remover."),
  });

  const permissionsMutation = useMutation({
    mutationFn: (input: { id: string; permissions: TeamPermission[] }) =>
      updatePermissions({ data: input }),
    onSuccess: () => {
      toast.success("Permissões atualizadas.");
      invalidate();
    },
    onError: (error: Error) =>
      toast.error(error.message || "Não foi possível atualizar as permissões."),
  });

  const inviteMutation = useMutation({
    mutationFn: (team_member_id: string) => generateInvite({ data: { team_member_id } }),
    onSuccess: (result) => {
      setRevealedInvite(result);
      toast.success("Convite gerado. Copie a senha agora.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível gerar o convite."),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => cancelInvite({ data: { id } }),
    onSuccess: () => {
      toast.success("Convite revogado.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível revogar o convite."),
  });

  const members = (team.data ?? []).filter((m) => filtro === "todos" || m.status === filtro);

  return (
    <div className="space-y-8">
      <div className="card-ink bg-surface p-6">
        <h2 className="font-display text-lg uppercase tracking-tight">Adicionar ao time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use para cadastrar colaboradores direto, sem passar por uma candidatura.
        </p>
        <AccessibleForm
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (form.full_name.trim().length < 2 || !form.email.includes("@")) {
              toast.error("Informe nome e e-mail válidos.");
              return;
            }
            creator.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="tm-nome">Nome</Label>
            <Input
              id="tm-nome"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-email">E-mail</Label>
            <Input
              id="tm-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-tel">Telefone</Label>
            <Input
              id="tm-tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={40}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-funcao">Função</Label>
            <Input
              id="tm-funcao"
              value={form.role_title}
              onChange={(e) => setForm({ ...form, role_title: e.target.value })}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-cidade">Cidade</Label>
            <Input
              id="tm-cidade"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              maxLength={80}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <Button type="submit" disabled={creator.isPending}>
              {creator.isPending ? "Adicionando..." : "Adicionar ao time"}
            </Button>
          </div>
        </AccessibleForm>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["todos", ...teamStatuses] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFiltro(s)}
            className={`border-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              filtro === s
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card"
            }`}
          >
            {s === "todos" ? "Todos" : teamStatusLabels[s]}
          </button>
        ))}
      </div>

      {revealedInvite ? (
        <div className="card-ink border-primary bg-primary/10 p-5" role="status">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg">Senha temporária — copie agora</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ela não poderá ser consultada novamente. Expira em{" "}
                {new Date(revealedInvite.expires_at).toLocaleDateString("pt-BR")}.
              </p>
              <p className="mt-3 font-mono text-lg font-bold">{revealedInvite.password}</p>
              <p className="mt-1 text-xs">
                {revealedInvite.email} · ativação em /ativar-colaborador
              </p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(revealedInvite.password);
                toast.success("Senha copiada.");
              }}
            >
              <Clipboard className="size-4" />
              Copiar
            </Button>
          </div>
        </div>
      ) : null}

      {team.isLoading && <Skeleton className="h-40 w-full" />}

      {team.isSuccess && members.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma pessoa no time com esse filtro.</p>
      )}

      <ul className="space-y-3">
        {members.map((member) => (
          <li key={member.id} className="card-ink bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-base">{member.full_name}</p>
                  <span
                    className={`border-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      statusStyles[member.status] ?? statusStyles["inactive"]
                    }`}
                  >
                    {teamStatusLabels[member.status as keyof typeof teamStatusLabels] ??
                      member.status}
                  </span>
                  {member.application_id && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      veio de candidatura
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-accent">{member.role_title}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" /> {member.email}
                  </span>
                  {member.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" /> {member.phone}
                    </span>
                  )}
                  {member.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" /> {member.city}
                    </span>
                  )}
                  <span>desde {new Date(member.joined_at).toLocaleDateString("pt-BR")}</span>
                  {member.last_activated_at ? (
                    <span>
                      última ativação{" "}
                      {new Date(member.last_activated_at).toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <span>acesso ainda não ativado</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={member.status}
                  onChange={(e) =>
                    updater.mutate({
                      id: member.id,
                      status: e.target.value as (typeof teamStatuses)[number],
                    })
                  }
                  className="h-9 border-2 border-border bg-background px-2 text-sm"
                  aria-label={`Status de ${member.full_name}`}
                >
                  {teamStatuses.map((s) => (
                    <option key={s} value={s}>
                      {teamStatusLabels[s]}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = window.prompt("Nova função", member.role_title);
                    if (next && next.trim().length > 1) {
                      updater.mutate({ id: member.id, role_title: next.trim() });
                    }
                  }}
                >
                  Editar função
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm(`Remover ${member.full_name} do time?`))
                      remover.mutate(member.id);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Remover {member.full_name} da equipe</span>
                </Button>
              </div>
            </div>
            <div className="mt-4 border-t-2 border-dashed border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Acesso do colaborador</p>
                  <p className="text-xs text-muted-foreground">
                    Adicionar ao time não libera acesso. Defina atividades e gere um convite
                    separado.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={member.status !== "active" || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate(member.id)}
                >
                  <KeyRound className="size-4" />
                  Gerar convite
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {teamPermissions.map((permission) => {
                  const checked = (member.permissions ?? []).includes(permission);
                  return (
                    <label
                      key={permission}
                      className="flex items-start gap-2 border-2 border-border p-3 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          if (
                            permission === "help_support" &&
                            next === true &&
                            !window.confirm(
                              "Esta permissão libera pedidos atribuídos com dados pessoais. Confirma a concessão?",
                            )
                          )
                            return;
                          const current = (member.permissions ?? []) as TeamPermission[];
                          const permissions =
                            next === true
                              ? [...new Set([...current, permission])]
                              : current.filter((item) => item !== permission);
                          permissionsMutation.mutate({ id: member.id, permissions });
                        }}
                      />
                      <span>
                        {permission === "help_support" ? (
                          <ShieldCheck className="mr-1 inline size-4" />
                        ) : null}
                        {permissionLabels[permission]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <section className="border-t-2 border-foreground pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Convites de colaborador</h2>
            <p className="text-sm text-muted-foreground">
              Histórico sem exibir senhas temporárias.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin/seguranca">Ver auditoria</Link>
          </Button>
        </div>
        {invites.isLoading ? (
          <Skeleton className="mt-4 h-20 w-full" />
        ) : (
          <ul className="mt-4 space-y-2">
            {invites.data?.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 border-2 border-border p-3 text-sm"
              >
                <div>
                  <p className="font-semibold">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {invite.status} · {invite.attempts} tentativa(s) · expira{" "}
                    {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {invite.status === "pending" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revokeMutation.mutate(invite.id)}
                    disabled={revokeMutation.isPending}
                  >
                    <XCircle className="size-4" />
                    Revogar
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
