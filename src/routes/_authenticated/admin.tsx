import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  adminStepUpStatus,
  endAdminStepUp,
  verifyAdminPassword,
} from "@/lib/admin-2fa.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração | DoaAqui" },
      {
        name: "description",
        content:
          "Painel de administração do DoaAqui: curadoria de pontos, usuários e categorias de itens.",
      },
      { property: "og:title", content: "Administração | DoaAqui" },
      { property: "og:description", content: "Gerencie pontos, usuários e categorias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

const tabs = [
  { to: "/admin/visao-geral", label: "Visão geral", exact: false, counter: null },
  { to: "/admin", label: "Pontos", exact: true, counter: null },
  { to: "/admin/curadoria", label: "Curadoria", exact: false, counter: "curation" },
  { to: "/admin/voluntarios", label: "Voluntários", exact: false, counter: "volunteers" },
  { to: "/admin/time", label: "Time", exact: false, counter: "team" },
  { to: "/admin/usuarios", label: "Usuários", exact: false, counter: null },
  { to: "/admin/categorias", label: "Categorias", exact: false, counter: null },
  { to: "/admin/seguranca", label: "Segurança", exact: false, counter: null },
] as const;

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { isAdmin: false, anyAdmin: true };
      const { data } = await supabase.rpc("is_admin");
      return { isAdmin: data === true, anyAdmin: true };
    },
  });
}

/** Etapa extra: confirmação da senha da conta administrativa. */
function StepUpForm({ email, onDone }: { email: string | null; onDone: () => void }) {
  const verify = useServerFn(verifyAdminPassword);
  const [password, setPassword] = useState("");
  const [showSetPassword, setShowSetPassword] = useState(false);

  const confirm = useMutation({
    mutationFn: () => verify({ data: { password } }),
    onSuccess: () => {
      setPassword("");
      toast.success("Painel liberado por 2 horas.");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message || "Senha incorreta."),
  });

  return (
    <div className="card-ink mt-8 max-w-lg p-6">
      <span className="inline-flex size-10 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground">
        <ShieldCheck className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-xl">Confirme que é você</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Por segurança, digite a senha da conta{" "}
        <strong className="text-foreground">{email ?? "administrativa"}</strong> para abrir o painel.
        A liberação vale por 2 horas.
      </p>

      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          confirm.mutate();
        }}
      >
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Sua senha"
          aria-label="Senha da conta"
          className="max-w-xs"
        />
        <Button type="submit" disabled={password.length < 6 || confirm.isPending}>
          {confirm.isPending ? "Verificando..." : "Liberar painel"}
        </Button>
      </form>

      <div className="mt-6 border-t-2 border-dashed border-foreground/20 pt-5">
        {showSetPassword ? (
          <div className="space-y-3">
            <h3 className="font-display text-base">Definir senha da conta</h3>
            <p className="text-xs text-muted-foreground">
              Você já está logado, então pode criar a senha aqui mesmo — sem e-mail.
            </p>
            <SetPasswordForm submitLabel="Salvar e usar esta senha" />
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => setShowSetPassword(false)}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ainda não tem senha (entra pelo Google ou link mágico)?{" "}
            <button
              type="button"
              className="font-medium text-primary underline"
              onClick={() => setShowSetPassword(true)}
            >
              Defina uma agora
            </button>
            .
          </p>
        )}
      </div>
    </div>
  );
}

function AdminLayout() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(adminStepUpStatus);
  const endStepUp = useServerFn(endAdminStepUp);

  const status = useQuery({
    queryKey: ["admin-step-up"],
    queryFn: () => fetchStatus(),
  });

  const isAdmin = status.data?.isAdmin === true;
  const verified = status.data?.verified === true;

  const counters = useQuery({
    queryKey: ["admin-counters"],
    enabled: isAdmin && verified,
    queryFn: async () => {
      const [curation, volunteers, team] = await Promise.all([
        supabase
          .from("collection_points")
          .select("id", { count: "exact", head: true })
          .eq("curation_status", "pending"),
        supabase
          .from("volunteer_applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("team_members")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);
      return {
        curation: curation.count ?? 0,
        volunteers: volunteers.count ?? 0,
        team: team.count ?? 0,
      } as Record<string, number>;
    },
  });

  const lock = useMutation({
    mutationFn: () => endStepUp(),
    onSuccess: () => {
      toast.success("Painel bloqueado.");
      queryClient.invalidateQueries({ queryKey: ["admin-step-up"] });
    },
  });

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Administração</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl">Painel do DoaAqui</h1>
          {status.data?.isOwner && (
            <span className="border-2 border-foreground bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
              Dono
            </span>
          )}
        </div>

        {status.isLoading && <Skeleton className="mt-8 h-40 w-full" />}

        {status.isSuccess && !isAdmin && (
          <div className="card-ink mt-8 max-w-lg p-6">
            <h2 className="font-display text-xl">Acesso restrito</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta área é exclusiva da equipe autorizada do DoaAqui. O acesso é concedido apenas
              pelo dono da plataforma — não é possível liberá-lo por conta própria.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        )}

        {status.isSuccess && isAdmin && !verified && (
          <StepUpForm
            email={status.data.email}
            onDone={() => queryClient.invalidateQueries({ queryKey: ["admin-step-up"] })}
          />
        )}

        {status.isSuccess && isAdmin && verified && (
          <>
            <nav
              className="mt-6 flex flex-wrap gap-2 border-b-2 border-foreground pb-4"
              aria-label="Seções da administração"
            >
              {tabs.map((tab) => {
                const count = tab.counter ? counters.data?.[tab.counter] : undefined;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    activeOptions={{ exact: tab.exact }}
                    className="inline-flex items-center gap-2 border-2 border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary data-[status=active]:border-foreground data-[status=active]:bg-foreground data-[status=active]:text-background"
                  >
                    {tab.label}
                    {typeof count === "number" && count > 0 && (
                      <span className="border border-current px-1.5 text-[10px] font-bold">{count}</span>
                    )}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => lock.mutate()}
                disabled={lock.isPending}
                className="ml-auto inline-flex items-center gap-2 border-2 border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary"
              >
                Bloquear painel
              </button>
            </nav>
            <div className="mt-8">
              <Outlet />
            </div>
          </>
        )}
      </section>
    </PageShell>
  );
}
