import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

/** Envia uma sugestão de correção para revisão da administração (não altera o cadastro). */
export function SuggestCorrection({ pointId }: { pointId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (message.trim().length < 5) {
      toast.error("Descreva a correção em pelo menos algumas palavras.");
      return;
    }
    setSending(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("point_corrections").insert({
      point_id: pointId,
      message: message.trim().slice(0, 2000),
      contact: contact.trim().slice(0, 200) || null,
      submitted_by: auth.user?.id ?? null,
    });
    setSending(false);
    if (error) {
      toast.error("Não conseguimos enviar agora. Tente de novo em instantes.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm">
        Obrigado! Sua sugestão foi enviada para revisão. O cadastro só muda depois que a
        administração conferir.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Sugerir correção
      </Button>
    );
  }

  return (
    <AccessibleForm
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <label className="block text-sm font-medium" htmlFor="correction-message">
        O que está errado ou desatualizado?
      </label>
      <Textarea
        id="correction-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Ex.: o telefone mudou, o local não recebe mais roupas, horário diferente…"
      />
      <label className="block text-sm font-medium" htmlFor="correction-contact">
        Seu contato (opcional)
      </label>
      <Input
        id="correction-contact"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        maxLength={200}
        placeholder="E-mail ou telefone, caso precisemos tirar dúvidas"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={sending}>
          {sending ? "Enviando…" : "Enviar sugestão"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </AccessibleForm>
  );
}
