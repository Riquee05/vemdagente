import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchCategories } from "@/lib/points";
import { saoPauloToday } from "@/lib/need-validity";
import { listManagedCampaigns, saveCampaign } from "@/lib/institution-workspace.functions";
export function CampaignEditor({ pointId }: { pointId: string }) {
  const [open, setOpen] = useState(false);
  const list = useServerFn(listManagedCampaigns);
  const query = useQuery({
    queryKey: ["managed-campaigns", pointId],
    queryFn: () => list({ data: { point_id: pointId } }),
    enabled: open,
  });
  return (
    <section className="mt-6 space-y-3">
      <Button variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>
        Gerenciar campanhas
      </Button>
      {open ? (
        <>
          <p className="text-sm">
            Campanhas precisam de meta e prazo. Atingir a meta ou vencer o prazo encerra a exibição
            pública. O andamento é informado pela instituição.
          </p>
          {query.isError ? (
            <p role="alert">{query.error.message}</p>
          ) : query.isPending ? (
            <p role="status">Carregando campanhas…</p>
          ) : (
            <>
              <CampaignForm pointId={pointId} />
              {query.data?.map((item) => (
                <CampaignForm key={item.id} pointId={pointId} item={item} />
              ))}
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
function CampaignForm({
  pointId,
  item,
}: {
  pointId: string;
  item?: Awaited<ReturnType<typeof listManagedCampaigns>>[number];
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveCampaign);
  const categories = useQuery({
    queryKey: ["item-categories"],
    queryFn: fetchCategories,
    staleTime: 300000,
  });
  const [form, setForm] = useState({
    title: item?.campaign_title ?? "",
    category: item?.category_id ?? "",
    target: item?.target_quantity ?? 1,
    received: item?.received_quantity ?? 0,
    unit: item?.quantity_unit ?? "unidades",
    deadline: item?.expires_at ?? "",
  });
  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          ...(item ? { need_id: item.id } : {}),
          campaign: {
            point_id: pointId,
            category_id: form.category,
            title: form.title,
            target: form.target,
            received: form.received,
            unit: form.unit,
            expires_at: form.deadline,
          },
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["managed-campaigns", pointId] });
      void qc.invalidateQueries({ queryKey: ["public-campaigns", pointId] });
      void qc.invalidateQueries({ queryKey: ["point-needs"] });
    },
  });
  const key = item?.id ?? `${pointId}-new`;
  return (
    <AccessibleForm
      className="space-y-3 rounded border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <h4 className="font-semibold">{item ? "Atualizar campanha" : "Nova campanha"}</h4>
      {item ? (
        <p className="text-xs">
          {item.is_active && (item.expires_at ?? "") >= saoPauloToday()
            ? "Em andamento"
            : "Encerrada ou vencida"}
        </p>
      ) : null}
      <label htmlFor={`${key}-title`} className="block">
        Título
      </label>
      <Input
        id={`${key}-title`}
        value={form.title}
        required
        minLength={3}
        maxLength={120}
        onChange={(event) => setForm({ ...form, title: event.target.value })}
      />
      <label htmlFor={`${key}-category`} className="block">
        Categoria
      </label>
      <select
        id={`${key}-category`}
        className="w-full rounded border border-input bg-background p-3"
        required
        value={form.category}
        onChange={(event) => setForm({ ...form, category: event.target.value })}
      >
        <option value="">Escolha</option>
        {categories.data?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>
      {categories.isError ? (
        <p role="alert">Categorias indisponíveis. Reabra o editor para tentar novamente.</p>
      ) : null}
      {(
        [
          ["target", "Meta"],
          ["received", "Quantidade recebida"],
        ] as const
      ).map(([field, label]) => (
        <div key={field}>
          <label htmlFor={`${key}-${field}`} className="block">
            {label}
          </label>
          <Input
            id={`${key}-${field}`}
            type="number"
            step={1}
            min={field === "target" ? 1 : 0}
            max={field === "received" ? form.target : 1000000}
            required
            value={form[field]}
            onChange={(event) => setForm({ ...form, [field]: Number(event.target.value) })}
          />
        </div>
      ))}
      <label htmlFor={`${key}-unit`} className="block">
        Unidade (cobertores, quilos…)
      </label>
      <Input
        id={`${key}-unit`}
        value={form.unit}
        required
        maxLength={30}
        onChange={(event) => setForm({ ...form, unit: event.target.value })}
      />
      <label htmlFor={`${key}-date`} className="block">
        Prazo
      </label>
      <Input
        id={`${key}-date`}
        type="date"
        required
        min={saoPauloToday()}
        value={form.deadline}
        onChange={(event) => setForm({ ...form, deadline: event.target.value })}
      />
      {save.isError ? <p role="alert">{save.error.message}</p> : null}
      {save.isSuccess ? <p role="status">Campanha salva.</p> : null}
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Salvando…" : "Salvar campanha"}
      </Button>
    </AccessibleForm>
  );
}
