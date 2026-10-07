import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTerritory, saveTerritory, territoryCounts } from "@/lib/territory.functions";
import { Button } from "@/components/ui/button";
import { AccessibleForm } from "@/components/accessibility/accessible-form";
export function PointTerritory({ pointId }: { pointId: string }) {
  const [open, setOpen] = useState(false);
  const info = useQuery({
    queryKey: ["point-territory", pointId],
    queryFn: () => getTerritory({ data: { point_id: pointId } }),
    enabled: open,
  });
  const id = useId();
  const client = useQueryClient();
  const [district, setDistrict] = useState("");
  const [zone, setZone] = useState<"Sul" | "Norte" | "Leste" | "Oeste" | "Centro">("Sul");
  const [source, setSource] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (info.data) {
      setDistrict(info.data.district);
      setZone(info.data.zone as typeof zone);
      setSource(info.data.source);
      setConfirmed(false);
    }
  }, [info.data]);
  const save = useMutation({
    mutationFn: () => saveTerritory({ data: { point_id: pointId, district, zone, source } }),
    onSuccess: () => {
      setConfirmed(false);
      void client.invalidateQueries({ queryKey: ["territory-counts"] });
      void client.invalidateQueries({ queryKey: ["point-territory", pointId] });
    },
  });
  return (
    <details className="mt-4 rounded border p-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">
        Classificar distrito e zona da capital
      </summary>
      <p className="my-3">
        Confira o distrito e a zona em uma fonte territorial antes de salvar. CEP e nome de bairro
        não comprovam a região.
      </p>
      {open && info.isPending && <p role="status">Carregando classificação…</p>}
      {info.isError && <p role="alert">{info.error.message}</p>}
      <AccessibleForm
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (confirmed) save.mutate();
        }}
      >
        <label className="block" htmlFor={`${id}-district`}>
          Distrito
          <input
            id={`${id}-district`}
            className="block w-full border p-3"
            required
            minLength={2}
            maxLength={100}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </label>
        <label className="block" htmlFor={`${id}-zone`}>
          Zona
          <select
            id={`${id}-zone`}
            className="block w-full border p-3"
            value={zone}
            onChange={(e) => setZone(e.target.value as typeof zone)}
          >
            {["Sul", "Norte", "Leste", "Oeste", "Centro"].map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </label>
        <label className="block" htmlFor={`${id}-source`}>
          Fonte consultada
          <input
            id={`${id}-source`}
            className="block w-full border p-3"
            required
            minLength={5}
            maxLength={500}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Conferi a classificação territorial.
        </label>
        <Button type="submit" disabled={!confirmed || save.isPending || !info.isSuccess}>
          Salvar classificação
        </Button>
        {save.isError && <p role="alert">{save.error.message}</p>}
        {save.isSuccess && <p role="status">Classificação salva.</p>}
      </AccessibleForm>
    </details>
  );
}
export function TerritoryCounts() {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["territory-counts"],
    queryFn: () => territoryCounts(),
    enabled: open,
  });
  return (
    <details className="border rounded p-4" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="font-semibold cursor-pointer">
        Instituições publicadas por zona da capital
      </summary>
      <p className="my-3">
        Somente cadastros classificados pela administração. Estes números não representam todas as
        ONGs existentes na região.
      </p>
      {open && q.isPending && <p role="status">Consultando…</p>}
      {q.isError && <p role="alert">{q.error.message}</p>}
      {q.data && (
        <>
          <ul>
            {q.data.counts.map((x) => (
              <li key={x.zone}>
                Zona {x.zone}: {x.count}
              </li>
            ))}
          </ul>
          <p>Sem classificação: {q.data.unclassified}</p>
        </>
      )}
      <Button className="mt-3" onClick={() => void q.refetch()}>
        Atualizar contagem
      </Button>
    </details>
  );
}
