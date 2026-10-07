import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { feedbackKinds } from "@/lib/institution-workspace";
import { submitContactFeedback } from "@/lib/institution-workspace.functions";
export function SuggestCorrection({ pointId }: { pointId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"phone" | "item" | "hours" | "closed" | "other">("other");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const send = useServerFn(submitContactFeedback);
  const mutation = useMutation({
    mutationFn: () => send({ data: { point_id: pointId, kind, message, contact, website } }),
  });
  if (mutation.isSuccess)
    return (
      <p role="status" className="rounded border border-border bg-surface p-4">
        Obrigado! Seu relato foi enviado à curadoria. As informações públicas só mudam após revisão.
      </p>
    );
  return (
    <section className="rounded border border-border p-4">
      <h2 className="font-semibold">Conseguiu entrar em contato?</h2>
      <p className="mt-2 text-sm">Se encontrou um problema, conte para a curadoria conferir.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {feedbackKinds.map(([value, label]) => (
          <Button
            key={value}
            variant="outline"
            size="sm"
            type="button"
            aria-pressed={open && kind === value}
            onClick={() => {
              setKind(value);
              setOpen(true);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {open ? (
        <AccessibleForm
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <label htmlFor={`correction-${pointId}`} className="block">
            O que aconteceu? Não inclua dados de pessoas atendidas.
          </label>
          <Textarea
            id={`correction-${pointId}`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            minLength={5}
            maxLength={1000}
          />
          <label htmlFor={`contact-${pointId}`} className="block">
            Seu contato (opcional, visível apenas para revisão)
          </label>
          <Input
            id={`contact-${pointId}`}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            maxLength={200}
          />
          <div hidden aria-hidden="true">
            <label htmlFor={`website-${pointId}`}>Site</label>
            <input
              id={`website-${pointId}`}
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
          {mutation.isError ? <p role="alert">{mutation.error.message}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Enviando…" : "Enviar para revisão"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </AccessibleForm>
      ) : null}
    </section>
  );
}
