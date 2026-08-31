import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

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
] as const;

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { isAdmin: false, anyAdmin: true };
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .maybeSingle();
      return { isAdmin: data?.role === "admin", anyAdmin: true };
    },
  });
}

function AdminLayout() {
  const queryClient = useQueryClient();
  const adminQuery = useIsAdmin();
  const isAdmin = adminQuery.data?.isAdmin === true;

  const counters = useQuery({
    queryKey: ["admin-counters"],
    enabled: isAdmin,
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

  const claim = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_first_admin");
      if (error) throw error;
      return data;
    },
    onSuccess: (ok) => {
      if (ok) {
        toast.success("Você agora é administrador.");
        queryClient.invalidateQueries({ queryKey: ["is-admin"] });
      } else {
        toast.error("Já existe um administrador nesta plataforma.");
      }
    },
    onError: () => toast.error("Não foi possível assumir a administração."),
  });

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Administração</p>
        <h1 className="mt-2 text-3xl font-semibold">Painel do DoaAqui</h1>

        {adminQuery.isLoading && <Skeleton className="mt-8 h-40 w-full" />}

        {adminQuery.isSuccess && !adminQuery.data.isAdmin && (
          <div className="mt-8 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta área é só para administradores. Se você é a pessoa responsável pela plataforma e
              ainda não há nenhum administrador, assuma a administração abaixo.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Depois disso você verá as abas de Pontos, Usuários e Categorias — e poderá importar
              novos pontos reais do Google Maps informando a cidade na aba Pontos.
            </p>
            <Button className="mt-4" onClick={() => claim.mutate()} disabled={claim.isPending}>
              {claim.isPending ? "Verificando..." : "Assumir administração"}
            </Button>

          </div>
        )}

        {adminQuery.isSuccess && adminQuery.data.isAdmin && (
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
