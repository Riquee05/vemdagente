import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Definir nova senha — Vem da Gente" },
      {
        name: "description",
        content:
          "Crie uma nova senha para sua conta do Vem da Gente. Use o link enviado por e-mail para concluir.",
      },
      { property: "og:title", content: "Definir nova senha — Vem da Gente" },
      {
        property: "og:description",
        content: "Crie uma nova senha para acessar sua conta do Vem da Gente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não são iguais.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(
        "Não foi possível salvar. Abra novamente o link do e-mail e tente em seguida.",
      );
      return;
    }
    toast.success("Senha atualizada! Use ela para entrar e liberar o painel.");
    navigate({ to: "/minha-conta", replace: true });
  }

  return (
    <PageShell>
      <section className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl">Definir nova senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Abra esta página pelo link que enviamos por e-mail. A senha escolhida aqui é a mesma usada
          para entrar e para liberar o painel de administração.
        </p>

        <Card className="mt-8 shadow-soft">
          <CardHeader>
            <CardTitle>Nova senha</CardTitle>
            <CardDescription>Use pelo menos 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Repita a senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
