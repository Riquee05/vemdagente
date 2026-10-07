import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { redeemAdminInvite } from "@/lib/admin-invites.functions";

export const Route = createFileRoute("/ativar-admin")({
  head: () => ({
    meta: [
      { title: "Ativar acesso administrativo | Vem da Gente" },
      {
        name: "description",
        content:
          "Recebeu uma senha temporária do Vem da Gente? Ative aqui seu acesso de administrador e defina sua senha definitiva.",
      },
      { property: "og:title", content: "Ativar acesso administrativo | Vem da Gente" },
      {
        property: "og:description",
        content: "Ative seu acesso de administrador com a senha temporária enviada pelo dono.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AtivarAdmin,
});

function AtivarAdmin() {
  const navigate = useNavigate();
  const redeem = useServerFn(redeemAdminInvite);

  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const ativar = useMutation({
    mutationFn: async () => {
      const result = await redeem({
        data: { email, temp_password: tempPassword, new_password: newPassword },
      });
      const { error } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: newPassword,
      });
      if (error) throw new Error("Acesso ativado. Faça login em Entrar com sua nova senha.");
      return result;
    },
    onSuccess: () => {
      toast.success("Acesso administrativo ativado.");
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível ativar o acesso."),
  });

  const senhasDiferem = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const podeEnviar =
    email.includes("@") &&
    tempPassword.trim().length >= 6 &&
    newPassword.length >= 8 &&
    !senhasDiferem;

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-lg px-4 py-14">
        <span className="inline-flex size-10 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-3xl">Ativar acesso administrativo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use o{" "}
          <strong className="text-foreground">mesmo e-mail da sua candidatura de voluntário</strong>{" "}
          e a senha temporária que o dono do Vem da Gente te enviou. Em seguida, crie a sua senha
          definitiva.
        </p>

        <form
          className="card-ink mt-8 space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            ativar.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail da candidatura</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="temp">Senha temporária</Label>
            <Input
              id="temp"
              type="text"
              autoComplete="off"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="xxxxx-xxxxx-xxxx"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nova">Nova senha (mínimo 8 caracteres)</Label>
            <Input
              id="nova"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar">Confirmar nova senha</Label>
            <Input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {senhasDiferem && <p className="text-xs text-destructive">As senhas não conferem.</p>}
          </div>

          <Button type="submit" className="w-full" disabled={!podeEnviar || ativar.isPending}>
            <KeyRound className="size-4" aria-hidden="true" />
            {ativar.isPending ? "Ativando..." : "Ativar acesso"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Ainda não se candidatou? Comece em{" "}
            <Link to="/voluntarios" className="underline">
              Voluntários
            </Link>
            . Já tem acesso? Vá para{" "}
            <Link to="/entrar" className="underline">
              Entrar
            </Link>
            .
          </p>
        </form>
      </section>
    </PageShell>
  );
}
