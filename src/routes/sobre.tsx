import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre o projeto | Vem da Gente" },
      { name: "description", content: "Conheça a missão, a independência e a responsabilidade do Vem da Gente." },
      { property: "og:title", content: "Sobre o projeto | Vem da Gente" },
      { property: "og:description", content: "Como o Vem da Gente reúne informações de locais para doação e apoio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

type Settings = Record<string, string>;

async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("project_settings").select("key, value");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

function AboutPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["project-settings"], queryFn: fetchSettings });
  const admin = useQuery({
    queryKey: ["is-admin-about"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return Boolean(data);
    },
  });
  const [form, setForm] = useState<Settings>({});

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const rows = ["owner_name", "owner_bio", "contact_email", "contact_whatsapp"].map((key) => ({
        key,
        value: (form[key] ?? "").trim(),
      }));
      const { error } = await supabase.from("project_settings").upsert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Apresentação atualizada.");
      queryClient.invalidateQueries({ queryKey: ["project-settings"] });
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  const data = settings.data ?? {};
  const contact = data.contact_email || data.contact_whatsapp;

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Sobre o projeto</p>
        <h1 className="mt-3 font-display text-4xl">Vem da Gente</h1>
        <div className="mt-8 space-y-6 text-base leading-7 text-foreground">
          <p>
            O Vem da Gente é uma iniciativa independente que aproxima pessoas dispostas a doar de
            pontos, instituições e redes de apoio. A plataforma não recebe, administra nem intermedia
            dinheiro ou a entrega de doações.
          </p>
          <p>
            Reunimos locais a partir de dados públicos e indicações da comunidade. Confira os detalhes
            e entre em contato com a instituição antes de levar sua doação.
          </p>
          <p>
            A origem de cada cadastro e o grau de confirmação são mostrados na ficha do local. Um ponto
            estar publicado significa que foi aceito para aparecer na plataforma, não que suas
            informações ou o recebimento de todos os itens estejam confirmados.
          </p>
        </div>

        {(data.owner_name || data.owner_bio) && (
          <section className="mt-10 border-t border-border pt-8">
            <h2 className="font-display text-2xl">Responsável pelo projeto</h2>
            {data.owner_name && <p className="mt-3 font-semibold">{data.owner_name}</p>}
            {data.owner_bio && <p className="mt-2 max-w-2xl text-muted-foreground">{data.owner_bio}</p>}
          </section>
        )}

        {contact && (
          <section className="mt-8 border-t border-border pt-8">
            <h2 className="font-display text-2xl">Contato</h2>
            {data.contact_email && <p className="mt-3">E-mail: {data.contact_email}</p>}
            {data.contact_whatsapp && <p className="mt-1">WhatsApp: {data.contact_whatsapp}</p>}
          </section>
        )}

        {admin.data && (
          <form
            className="mt-12 space-y-4 border-t border-border pt-8"
            onSubmit={(event) => { event.preventDefault(); save.mutate(); }}
          >
            <h2 className="font-display text-2xl">Editar apresentação</h2>
            <p className="text-sm text-muted-foreground">
              Campos vazios não aparecem publicamente.
            </p>
            <div><Label htmlFor="owner-name">Nome do responsável</Label><Input id="owner-name" className="mt-2" value={form.owner_name ?? ""} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
            <div><Label htmlFor="owner-bio">Breve história</Label><Textarea id="owner-bio" className="mt-2" rows={4} value={form.owner_bio ?? ""} onChange={(e) => setForm({ ...form, owner_bio: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="contact-email">E-mail do projeto</Label><Input id="contact-email" className="mt-2" value={form.contact_email ?? ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><Label htmlFor="contact-whatsapp">WhatsApp do projeto</Label><Input id="contact-whatsapp" className="mt-2" value={form.contact_whatsapp ?? ""} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} /></div>
            </div>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
          </form>
        )}
      </main>
    </PageShell>
  );
}
