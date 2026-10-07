import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestInstitutionAccess } from "@/lib/community.functions";
export function InstitutionAccessRequest({ pointId }: { pointId: string }) {
  const { user } = useAuth();
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const submit = useMutation({
    mutationFn: () => requestInstitutionAccess({ data: { point_id: pointId, contact, message } }),
    onSuccess: () => {
      setSent(true);
      toast.success("Pedido enviado para revisão.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar."),
  });
  return (
    <details className="mt-4 rounded-lg border border-border p-4">
      <summary className="cursor-pointer font-semibold">Representa esta instituição?</summary>
      <p className="mt-3 text-sm text-muted-foreground">
        Solicite acesso para atualizar as necessidades. A administração vai confirmar seu vínculo
        antes de liberar a gestão.
      </p>
      {!user ? (
        <Button asChild className="mt-3">
          <Link to="/entrar">Entrar para solicitar acesso</Link>
        </Button>
      ) : sent ? (
        <p role="status" className="mt-3">
          Sua solicitação está aguardando revisão. Após a aprovação, a instituição aparecerá em
          Minha conta.
        </p>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit.mutate();
          }}
        >
          <div>
            <Label htmlFor="claim-contact">Contato institucional para confirmação</Label>
            <Input
              id="claim-contact"
              required
              minLength={5}
              maxLength={200}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="claim-message">Seu cargo e vínculo com a instituição</Label>
            <Textarea
              id="claim-message"
              required
              minLength={20}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <Button disabled={submit.isPending} type="submit">
            {submit.isPending ? "Enviando…" : "Solicitar revisão do acesso"}
          </Button>
        </form>
      )}
    </details>
  );
}
