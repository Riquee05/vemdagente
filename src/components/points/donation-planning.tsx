import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { deliveryFields, donationChecklist } from "@/lib/donation-planning";
import { getPublicDelivery } from "@/lib/delivery.functions";
import { formatDate } from "@/lib/points";
export function DonationPlanning({
  pointId,
  categories,
}: {
  pointId: string;
  categories: string[];
}) {
  const id = useId();
  const info = useQuery({
    queryKey: ["point-delivery", pointId],
    queryFn: () => getPublicDelivery({ data: { point_id: pointId } }),
    staleTime: 60000,
  });
  return (
    <section className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold">Antes de doar</h2>
      <p className="text-sm">
        Checklist pessoal para esta visita. Marcar os itens não confirma o recebimento pela
        instituição.
      </p>
      <div className="space-y-3">
        {donationChecklist(categories).map((text, i) => (
          <label
            key={text}
            htmlFor={`${id}-${i}`}
            className="flex min-h-11 cursor-pointer items-start gap-3 py-2"
          >
            <input id={`${id}-${i}`} type="checkbox" className="mt-1 h-5 w-5 shrink-0" />
            <span>{text}</span>
          </label>
        ))}
      </div>
      <h2 className="text-lg font-semibold">Entrega e agendamento</h2>
      {info.isPending ? (
        <p role="status">Carregando informações…</p>
      ) : info.isError ? (
        <p role="alert">Não foi possível consultar. Confirme diretamente com a instituição.</p>
      ) : (
        <>
          <dl>
            {deliveryFields.map(([key, label]) => (
              <div key={key} className="mt-2">
                <dt className="font-medium">{label}</dt>
                <dd>
                  {info.data?.[key] === "yes"
                    ? "Sim"
                    : info.data?.[key] === "no"
                      ? "Não"
                      : "Não informado — confirme antes de ir"}
                </dd>
              </div>
            ))}
          </dl>
          {info.data?.confirmed_at && (
            <p className="text-sm text-muted-foreground">
              Informações confirmadas em {formatDate(info.data.confirmed_at)}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
