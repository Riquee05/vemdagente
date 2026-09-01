import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta no DoaAqui" },
      {
        name: "description",
        content:
          "Entre no DoaAqui com Google, link mágico por e-mail ou senha. Buscar pontos e usar o assistente não exige conta.",
      },
      { property: "og:title", content: "Entrar ou criar conta no DoaAqui" },
      {
        property: "og:description",
        content: "Google, link mágico ou senha. Buscar pontos continua sem login.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EntrarPage,
});

function EntrarPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/minha-conta", replace: true });
    }
  }, [loading, user, navigate]);

  async function signInWithGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Não conseguimos entrar com o Google agora. Tente de novo.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/minha-conta" });
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      toast.error("Não conseguimos enviar o link. Confira o e-mail e tente de novo.");
      return;
    }
    toast.success("Link enviado! Confira sua caixa de entrada.");
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("E-mail ou senha incorretos.");
      return;
    }
    navigate({ to: "/minha-conta" });
  }

  /** Envia o e-mail de redefinição de senha (também serve para criar a primeira senha). */
  async function sendPasswordReset() {
    if (!email) {
      toast.error("Escreva seu e-mail acima primeiro.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    if (error) {
      toast.error("Não conseguimos enviar o e-mail agora. Tente de novo em instantes.");
      return;
    }
    toast.success("Enviamos um link para você criar uma nova senha.");
  }


  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Confirme o e-mail que enviamos para entrar.");
  }

  return (
    <PageShell>
      <section className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
        <h1 className="text-3xl font-semibold">Entrar no DoaAqui</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você só precisa de conta para registrar um pedido de ajuda que fica salvo ou para
          administrar. Para{" "}
          <Link to="/doar" className="font-medium text-primary underline-offset-4 hover:underline">
            buscar pontos
          </Link>{" "}
          e usar o{" "}
          <Link
            to="/assistente"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            assistente
          </Link>
          , não precisa.
        </p>

        <Card className="mt-8 shadow-soft">
          <CardHeader>
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>Escolha a forma mais prática para você.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={signInWithGoogle}
              disabled={busy || loading}
            >
              Continuar com Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>

            <Tabs defaultValue="magic">
              <TabsList className="w-full">
                <TabsTrigger value="magic" className="flex-1">
                  Link mágico
                </TabsTrigger>
                <TabsTrigger value="senha" className="flex-1">
                  Senha
                </TabsTrigger>
                <TabsTrigger value="criar" className="flex-1">
                  Criar conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="magic" className="pt-4">
                <form onSubmit={sendMagicLink} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="magic-email">E-mail</Label>
                    <Input
                      id="magic-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Enviando..." : "Enviar link de acesso"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="senha" className="pt-4">
                <form onSubmit={signInWithPassword} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Entrando..." : "Entrar"}
                  </Button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    onClick={sendPasswordReset}
                    disabled={busy}
                  >
                    Esqueci minha senha / quero definir uma
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="criar" className="pt-4">
                <form onSubmit={signUp} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">Nome</Label>
                    <Input
                      id="signup-name"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Criando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
