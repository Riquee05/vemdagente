import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  accessibilityFields,
  accessibilityLabels,
  emptyAccessibility,
  type AccessibilityValue,
} from "@/lib/accessibility";
import { getAdminAccessibility, savePointAccessibility } from "@/lib/accessibility.functions";
export function PointAccessibilityEditor({ pointId }: { pointId: string }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ ...emptyAccessibility });
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const formId = useId();
  const client = useQueryClient();
  const info = useQuery({
    queryKey: ["admin-point-accessibility", pointId],
    queryFn: () => getAdminAccessibility({ data: { point_id: pointId } }),
    enabled: open,
  });
  useEffect(() => {
    if (info.data) {
      const next = { ...emptyAccessibility };
      accessibilityFields.forEach(([field]) => {
        next[field] = info.data![field] as AccessibilityValue;
      });
      setFields(next);
      setConfirmed(false);
    }
  }, [info.data]);
  const save = useMutation({
    mutationFn: () =>
      savePointAccessibility({ data: { point_id: pointId, ...fields, confirmed: true } }),
    onSuccess: () => {
      setFeedback("Informações de acessibilidade salvas.");
      setConfirmed(false);
      void client.invalidateQueries({ queryKey: ["point-accessibility", pointId] });
      void client.invalidateQueries({ queryKey: ["admin-point-accessibility", pointId] });
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
        Confirmar acessibilidade da instituição
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
            {accessibilityFields.map(([field, label]) => (
              <div key={field}>
                <label htmlFor={`${formId}-${field}`} className="block text-sm font-medium">
                  {label}
                </label>
                <select
                  id={`${formId}-${field}`}
                  className="mt-1 w-full rounded-md border border-input bg-background p-3"
                  value={fields[field]}
                  onChange={(event) =>
                    setFields({ ...fields, [field]: event.target.value as AccessibilityValue })
                  }
                >
                  {Object.entries(accessibilityLabels).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <label className="flex items-start gap-3 text-sm">
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
