import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  accessibilityFields,
  accessibilityLabels,
  type AccessibilityValue,
} from "@/lib/accessibility";
import { getPublicAccessibility } from "@/lib/accessibility.functions";
export function AccessibilityInfo({ pointId }: { pointId: string }) {
  const info = useQuery({
    queryKey: ["point-accessibility", pointId],
    queryFn: () => getPublicAccessibility({ data: { point_id: pointId } }),
  });
  return (
    <section
      className="mt-6 rounded-xl border border-border p-4"
      aria-labelledby="accessibility-heading"
    >
      <h2 id="accessibility-heading" className="text-lg font-semibold">
        Acessibilidade e atendimento
      </h2>
      {info.isPending ? (
        <p role="status">Carregando informações…</p>
      ) : info.isError ? (
        <div role="alert">
          Não foi possível consultar estas informações.{" "}
          <Button variant="outline" onClick={() => void info.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <dl className="mt-3 space-y-3">
            {accessibilityFields.map(([field, label]) => (
              <div key={field}>
                <dt className="font-medium">{label}</dt>
                <dd>
                  {accessibilityLabels[(info.data?.[field] ?? "unknown") as AccessibilityValue]}
                </dd>
              </div>
            ))}
          </dl>
          {info.data?.confirmed_at && (
            <p className="mt-3 text-sm">
              Confirmado com a instituição em{" "}
              {new Date(info.data.confirmed_at).toLocaleDateString("pt-BR")}.
              {Date.now() - Date.parse(info.data.confirmed_at) > 90 * 86400000
                ? " A confirmação tem mais de 90 dias."
                : ""}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            “Não informado” significa que ainda não temos confirmação. Consulte a instituição para
            combinar sua visita e explicar o apoio de que precisa.
          </p>
        </>
      )}
    </section>
  );
}
