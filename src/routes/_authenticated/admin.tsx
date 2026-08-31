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
  { to: "/admin", label: "Pontos", exact: true },
  { to: "/admin/usuarios", label: "Usuários", exact: false },
  { to: "/admin/categorias", label: "Categorias", exact: false },
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
            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Seções da administração">
              {tabs.map((tab) => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  activeOptions={{ exact: tab.exact }}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
                >
                  {tab.label}
                </Link>
              ))}
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
