import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha conta | DoaAqui" },
      {
        name: "description",
        content:
          "Ajuste seu nome, sua cidade padrão e seu papel no DoaAqui: quem doa, quem precisa de ajuda ou quem administra.",
      },
      { property: "og:title", content: "Minha conta | DoaAqui" },
      { property: "og:description", content: "Nome, cidade padrão e papel na plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MinhaContaPage,
});

const roleLabels = {
  donor: "Quero doar (Doador)",
  person_in_need: "Preciso de ajuda (Necessitado)",
} as const;

type Role = keyof typeof roleLabels;


function MinhaContaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, default_city, default_lat, default_lng")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return { profile: data, email: auth.user.email ?? "" };
    },
  });

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<Role>("donor");

  useEffect(() => {
    const p = profileQuery.data?.profile;
    if (!p) return;
    setFullName(p.full_name ?? "");
    setCity(p.default_city ?? "");
    setRole((p.role as Role) ?? "donor");
  }, [profileQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      const id = profileQuery.data?.profile?.id;
      if (!id) throw new Error("Perfil não encontrado");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName || null, default_city: city || null, role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados salvos.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Não conseguimos salvar agora. Tente de novo."),
  });

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/" });
  }

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Minha conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu nome, sua cidade padrão e como você usa o DoaAqui.
        </p>

        <Card className="mt-8 shadow-soft">
          <CardHeader>
            <CardTitle>Dados do perfil</CardTitle>
            <CardDescription>
              {profileQuery.data?.email ? profileQuery.data.email : "Carregando..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {profileQuery.isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {profileQuery.isError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p>Não conseguimos carregar seu perfil.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => profileQuery.refetch()}
                >
                  Tentar de novo
                </Button>
              </div>
            )}

            {profileQuery.isSuccess && !profileQuery.data.profile && (
              <p className="text-sm text-muted-foreground">
                Ainda não encontramos um perfil para esta conta. Saia e entre novamente para
                criá-lo.
              </p>
            )}

            {profileQuery.isSuccess && profileQuery.data.profile && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="full-name">Nome</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Como podemos te chamar"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="default-city">Cidade padrão</Label>
                  <Input
                    id="default-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usada para já mostrar pontos próximos quando você abrir as buscas.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role">Como você usa o DoaAqui</Label>
                  <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="donor">{roleLabels.donor}</SelectItem>
                      <SelectItem value="person_in_need">{roleLabels.person_in_need}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O acesso administrativo é concedido pela equipe do projeto e não pode ser
                    escolhido aqui.
                  </p>
                </div>


                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={signOut}>
                    Sair da conta
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
