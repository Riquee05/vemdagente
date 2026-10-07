import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getManagedInstitution,
  proposeInstitutionUpdate,
} from "@/lib/institution-workspace.functions";
const fields = [
  ["name", "Nome", 160],
  ["phone", "Telefone", 40],
  ["whatsapp", "WhatsApp", 40],
  ["website", "Site (http ou https)", 300],
  ["opening_hours", "Horário de funcionamento", 300],
  ["donation_hours", "Horário de doações", 300],
  ["description", "Apresentação", 500],
] as const;
export function InstitutionEditor({ pointId }: { pointId: string }) {
  const get = useServerFn(getManagedInstitution);
  const point = useQuery({
    queryKey: ["managed-institution", pointId],
    queryFn: () => get({ data: { point_id: pointId } }),
    refetchOnWindowFocus: false,
  });
  return (
    <section className="mt-6 space-y-3">
      <h3 className="font-semibold">Propor atualização da ficha</h3>
      <p className="text-sm">
        Apenas responsáveis com vínculo aprovado podem enviar. Nome, contatos, horários e
        apresentação passam pela administração. Para mudar endereço, envie uma correção pela ficha
        pública.
      </p>
      {point.isPending ? (
        <p role="status">Verificando vínculo…</p>
      ) : point.isError ? (
        <p role="status">{point.error.message}</p>
      ) : point.data ? (
        <Editor key={point.data.updated_at} point={point.data} />
      ) : null}
    </section>
  );
}
function Editor({ point }: { point: Awaited<ReturnType<typeof getManagedInstitution>> }) {
  const [patch, setPatch] = useState({
    name: point.name,
    phone: point.phone ?? "",
    whatsapp: point.whatsapp ?? "",
    website: point.website ?? "",
    opening_hours: point.opening_hours ?? "",
    donation_hours: point.donation_hours ?? "",
    description: point.description ?? "",
  });
  const propose = useServerFn(proposeInstitutionUpdate);
  const save = useMutation({
    mutationFn: () =>
      propose({ data: { point_id: point.id, baseline_updated_at: point.updated_at, patch } }),
  });
  if (save.isSuccess)
    return (
      <p role="status">
        Proposta enviada. A ficha permanece igual até a aprovação da administração.
      </p>
    );
  return (
    <AccessibleForm
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      {fields.map(([field, label, max]) => (
        <div key={field}>
          <label htmlFor={`${point.id}-${field}`} className="block">
            {label}
          </label>
          <Input
            id={`${point.id}-${field}`}
            value={patch[field]}
            maxLength={max}
            required={field === "name"}
            minLength={field === "name" ? 3 : undefined}
            onChange={(event) => setPatch({ ...patch, [field]: event.target.value })}
          />
        </div>
      ))}
      {save.isError ? <p role="alert">{save.error.message}</p> : null}
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Enviando…" : "Enviar atualização para revisão"}
      </Button>
    </AccessibleForm>
  );
}
