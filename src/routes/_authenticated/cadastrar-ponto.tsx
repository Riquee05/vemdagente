import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { PointsMap } from "@/components/map/points-map";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress, getBrowserLocation } from "@/lib/geocode";
import { fetchCategories, PHOTO_BUCKET } from "@/lib/points";

export const Route = createFileRoute("/_authenticated/cadastrar-ponto")({
  head: () => ({
    meta: [
      { title: "Cadastrar ponto de coleta | DoaAqui" },
      {
        name: "description",
        content:
          "Cadastre um ponto de coleta ou ONG real com foto, localização no mapa e os itens que o local aceita. A curadoria do DoaAqui revisa antes de publicar.",
      },
      { property: "og:title", content: "Cadastrar ponto de coleta | DoaAqui" },
      {
        property: "og:description",
        content: "Adicione um local de doação com foto e localização precisa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CadastrarPontoPage,
});

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];

function CadastrarPontoPage() {
  const navigate = useNavigate();
  const categories = useQuery({ queryKey: ["item-categories"], queryFn: fetchCategories });

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    whatsapp: "",
    website: "",
    opening_hours: "",
    donation_method: "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function toggleCategory(id: string) {
    setAccepted((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  }

  async function locateFromAddress() {
    const query = [form.address, form.city, form.state].filter(Boolean).join(", ");
    if (!query) {
      toast.error("Preencha o endereço ou a cidade primeiro.");
      return;
    }
    const found = await geocodeAddress(query);
    if (!found) {
      toast.error("Não encontramos esse endereço no mapa. Ajuste ou clique no mapa.");
      return;
    }
    setCoords({ lat: found.lat, lng: found.lng });
    if (!form.city && found.city) update("city", found.city);
    toast.success("Localização encontrada. Ajuste o pino clicando no mapa se precisar.");
  }

  async function locateFromBrowser() {
    try {
      setCoords(await getBrowserLocation());
      toast.success("Usando sua localização atual.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao localizar.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim() || !form.city.trim()) {
      toast.error("Nome e cidade são obrigatórios.");
      return;
    }
    if (!coords) {
      toast.error("Marque a localização no mapa.");
      return;
    }

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sessão expirada. Entre novamente.");

      let photoPath: string | null = null;
      if (photo) {
        const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, photo, { upsert: false, contentType: photo.type });
        if (uploadError) throw uploadError;
        photoPath = path;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("collection_points")
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim(),
          state: form.state.trim() || null,
          phone: form.phone.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          website: form.website.trim() || null,
          opening_hours: form.opening_hours.trim() || null,
          donation_method: form.donation_method.trim() || null,
          lat: coords.lat,
          lng: coords.lng,
          photo_url: photoPath,
          source: "user",
          curation_status: "pending",
          submitted_by: userId,
          claimed_by: userId,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      if (accepted.length) {
        const { error: itemsError } = await supabase.from("point_accepted_items").insert(
          accepted.map((categoryId) => ({
            point_id: inserted.id,
            category_id: categoryId,
          })),
        );
        if (itemsError) throw itemsError;
      }

      toast.success("Ponto enviado! Ele aparece no mapa após a curadoria aprovar.");
      navigate({ to: "/pontos/$pointId", params: { pointId: inserted.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o ponto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Cadastro de ponto
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Cadastrar um ponto de coleta real</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Preencha os dados do local, marque a posição no mapa e envie uma foto. A curadoria revisa
          antes de publicar para todo mundo.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <div>
            <Label htmlFor="name">Nome do local *</Label>
            <Input
              id="name"
              className="mt-2"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">O que o local faz</Label>
            <Textarea
              id="description"
              className="mt-2"
              rows={3}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                className="mt-2"
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                className="mt-2"
                value={form.city}
                onChange={(event) => update("city", event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="state">Estado (UF)</Label>
              <Input
                id="state"
                className="mt-2"
                maxLength={2}
                value={form.state}
                onChange={(event) => update("state", event.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Label>Localização no mapa *</Label>
              <Button type="button" size="sm" variant="outline" onClick={locateFromAddress}>
                Localizar pelo endereço
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={locateFromBrowser}>
                Usar minha localização
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Clique no mapa para ajustar o pino exatamente onde as doações são recebidas.
            </p>
            <PointsMap
              className="mt-3 h-72 w-full overflow-hidden rounded-xl border border-border"
              center={coords ? [coords.lat, coords.lng] : DEFAULT_CENTER}
              zoom={coords ? 16 : 11}
              onPick={(lat, lng) => setCoords({ lat, lng })}
              points={
                coords
                  ? [{ id: "novo", name: form.name || "Novo ponto", lat: coords.lat, lng: coords.lng }]
                  : []
              }
            />
            {coords ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Posição: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            ) : null}
          </div>

          <div>
            <Label>O que o local aceita</Label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(categories.data ?? []).map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={accepted.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                className="mt-2"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                className="mt-2"
                value={form.whatsapp}
                onChange={(event) => update("whatsapp", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="opening_hours">Horários</Label>
              <Input
                id="opening_hours"
                className="mt-2"
                placeholder="Seg a sex, 9h às 17h"
                value={form.opening_hours}
                onChange={(event) => update("opening_hours", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="website">Site ou rede social</Label>
              <Input
                id="website"
                className="mt-2"
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="donation_method">Como doar</Label>
              <Input
                id="donation_method"
                className="mt-2"
                placeholder="Entregar no local, retirada agendada, Pix…"
                value={form.donation_method}
                onChange={(event) => update("donation_method", event.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="photo">Foto do local (até 5 MB)</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              className="mt-2"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
          </div>

          <Button type="submit" disabled={busy}>
            {busy ? "Enviando…" : "Enviar para curadoria"}
          </Button>
        </form>
      </section>
    </PageShell>
  );
}
