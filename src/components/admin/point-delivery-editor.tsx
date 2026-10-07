import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { deliveryFields, emptyDelivery } from "@/lib/donation-planning";
import { getAdminDelivery, savePointDelivery } from "@/lib/delivery.functions";
const deliveryLabels = { yes: "Sim", no: "Não", unknown: "Não informado" };
export function PointDeliveryEditor({ pointId }: { pointId: string }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<
    Record<(typeof deliveryFields)[number][0], "yes" | "no" | "unknown">
  >({ ...emptyDelivery });
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const formId = useId();
  const client = useQueryClient();
  const info = useQuery({
    queryKey: ["admin-point-delivery", pointId],
    queryFn: () => getAdminDelivery({ data: { point_id: pointId } }),
    enabled: open,
  });
  useEffect(() => {
    if (info.data) {
      const next: Record<(typeof deliveryFields)[number][0], "yes" | "no" | "unknown"> = {
        ...emptyDelivery,
      };
      deliveryFields.forEach(([field]) => {
        next[field] = info.data![field] as "yes" | "no" | "unknown";
      });
      setFields(next);
      setConfirmed(false);
    }
  }, [info.data]);
  const save = useMutation({
    mutationFn: () =>
      savePointDelivery({ data: { point_id: pointId, ...fields, confirmed: true } }),
    onSuccess: () => {
      setFeedback("Informações de entrega e agendamento salvas.");
      setConfirmed(false);
      void client.invalidateQueries({ queryKey: ["point-delivery", pointId] });
      void client.invalidateQueries({ queryKey: ["admin-point-delivery", pointId] });
    },
    onError: (error) =>
      setFeedback(error instanceof Error ? error.message : "Não foi possível salvar."),
  });
  return (
    <details
      className="mt-4 rounded-lg border border-border p-3"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer font-semibold">
        Confirmar entrega e agendamento da instituição
      </summary>
      {info.isPending && open && <p role="status">Carregando…</p>}
      {info.isError ? (
        <div role="alert">
          {info.error.message} <Button onClick={() => void info.refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        info.isSuccess && (
          <AccessibleForm
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setFeedback("");
              if (confirmed) save.mutate();
            }}
          >
            {deliveryFields.map(([field, label]) => (
              <div key={field}>
                <label htmlFor={`${formId}-${field}`} className="block text-sm font-medium">
                  {label}
                </label>
                <select
                  id={`${formId}-${field}`}
                  className="mt-1 w-full rounded-md border border-input bg-background p-3"
                  value={fields[field]}
                  onChange={(event) =>
                    setFields({
                      ...fields,
                      [field]: event.target.value as "yes" | "no" | "unknown",
                    })
                  }
                >
                  {Object.entries(deliveryLabels).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                Confirmei os itens informados com um representante da instituição. Os demais
                continuam como “Não informado”.
              </span>
            </label>
            <Button type="submit" disabled={!confirmed || save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar confirmação"}
            </Button>
          </AccessibleForm>
        )
      )}
      <p role={save.isError ? "alert" : "status"} aria-live="polite" className="mt-3 text-sm">
        {feedback}
      </p>
    </details>
  );
}
