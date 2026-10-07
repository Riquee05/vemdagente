import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  /** Chamado após a senha ser salva com sucesso. */
  onDone?: () => void;
  submitLabel?: string;
};

/** Permite que a pessoa logada crie ou troque a senha da própria conta. */
export function SetPasswordForm({ onDone, submitLabel = "Salvar senha" }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [needsCurrent, setNeedsCurrent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Use pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não são iguais.");
      return;
    }

    setBusy(true);
    const payload: Record<string, string> = { password };
    if (needsCurrent && currentPassword) payload["current_password"] = currentPassword;
    const { error } = await supabase.auth.updateUser(payload as { password: string });
    setBusy(false);

    if (error) {
      const message = error.message?.toLowerCase() ?? "";
      if (message.includes("current password") || message.includes("senha atual")) {
        setNeedsCurrent(true);
        toast.error("Digite também a senha atual para concluir a troca.");
        return;
      }
      toast.error("Não foi possível salvar a senha agora. Tente novamente.");
      return;
    }

    setPassword("");
    setConfirm("");
    setCurrentPassword("");
    toast.success("Senha salva! Use ela para entrar no Vem da Gente.");
    onDone?.();
  }

  return (
    <AccessibleForm className="space-y-3" onSubmit={save}>
      {needsCurrent ? (
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Senha atual</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="max-w-xs"
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="account-new-password">Nova senha</Label>
        <Input
          id="account-new-password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="max-w-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="account-confirm-password">Repita a senha</Label>
        <Input
          id="account-confirm-password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="max-w-xs"
        />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Salvando..." : submitLabel}
      </Button>
    </AccessibleForm>
  );
}
