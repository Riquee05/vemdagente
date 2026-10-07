import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { redeemTeamInvite } from "@/lib/team-invites.functions";

export const Route = createFileRoute("/ativar-colaborador")({
  head: () => ({
    meta: [
      { title: "Ativar acesso de colaborador | Vem da Gente" },
      { name: "description", content: "Ative seu acesso de colaborador ao Vem da Gente." },
      { property: "og:title", content: "Ativar acesso de colaborador | Vem da Gente" },
      {
        property: "og:description",
        content: "Ative seu acesso de colaborador com o convite recebido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivateCollaborator,
});

function ActivateCollaborator() {
  const navigate = useNavigate();
  const redeem = useServerFn(redeemTeamInvite);
  const [email, setEmail] = useState("");
  const [temporary, setTemporary] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const activation = useMutation({
    mutationFn: async () => {
      const result = await redeem({
        data: { email, temp_password: temporary, new_password: password },
      });
      const { error } = await supabase.auth.signInWithPassword({ email: result.email, password });
      if (error) throw new Error("Acesso ativado. Entre novamente com sua nova senha.");
      return result;
    },
    onSuccess: () => {
      toast.success("Acesso de colaborador ativado.");
      navigate({ to: "/colaborador" });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Não foi possível concluir a ativação."),
  });
  const mismatch = confirmation.length > 0 && confirmation !== password;
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-lg px-4 py-14">
        <span className="inline-flex size-10 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground">
          <Users className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-3xl">Ativar acesso de colaborador</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use o e-mail cadastrado no time e a senha temporária recebida. Depois, crie sua senha
          definitiva.
        </p>
        <AccessibleForm
          className="card-ink mt-8 space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            activation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="team-email">E-mail</Label>
            <Input
              id="team-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-temp">Senha temporária</Label>
            <Input
              id="team-temp"
              value={temporary}
              onChange={(event) => setTemporary(event.target.value)}
              autoComplete="off"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-password">Nova senha</Label>
            <Input
              id="team-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-confirmation">Confirmar nova senha</Label>
            <Input
              id="team-confirmation"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {mismatch ? <p className="text-xs text-destructive">As senhas não conferem.</p> : null}
          </div>
          <Button
            className="w-full"
            type="submit"
            disabled={
              !email.includes("@") ||
              temporary.length < 6 ||
              password.length < 8 ||
              mismatch ||
              activation.isPending
            }
          >
            <KeyRound className="size-4" />
            {activation.isPending ? "Ativando..." : "Ativar acesso"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Já ativou?{" "}
            <Link to="/entrar" className="underline">
              Entre na sua conta
            </Link>
            .
          </p>
        </AccessibleForm>
      </section>
    </PageShell>
  );
}
