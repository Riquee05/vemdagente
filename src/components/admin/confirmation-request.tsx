import { useState } from "react";
import { Button } from "@/components/ui/button";
export function ConfirmationRequest({ name }: { name: string }) {
  const [feedback, setFeedback] = useState("");
  const message = `Olá! Estamos revisando a ficha de ${name} no Vem da Gente. Podem confirmar endereço, telefone, horário de doações, itens aceitos e necessidades atuais? Também precisamos saber sobre acessibilidade, entrega, retirada e agendamento. Para administrar a ficha, entrem no site, abram a instituição e escolham “Representa esta instituição?”. Obrigado!`;
  return (
    <details className="mt-4 rounded border p-3">
      <summary className="cursor-pointer font-semibold">Solicitar confirmação da ficha</summary>
      <p className="my-3">
        Copie e revise a mensagem antes de enviar pelo contato oficial da instituição. A resposta
        ainda precisa ser conferida na Curadoria.
      </p>
      <p className="whitespace-pre-wrap break-words">{message}</p>
      <Button
        className="mt-3"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(message);
            setFeedback("Mensagem copiada.");
          } catch {
            setFeedback("Não foi possível copiar. Selecione o texto acima e copie manualmente.");
          }
        }}
      >
        Copiar pedido de confirmação
      </Button>
      <p role="status" className="mt-2">
        {feedback}
      </p>
    </details>
  );
}
