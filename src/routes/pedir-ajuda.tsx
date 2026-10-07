import { AccessibleForm } from "@/components/accessibility/accessible-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout/page-shell";
import { PointsMap } from "@/components/map/points-map";
import { PointCard } from "@/components/points/point-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  geocodeAddress,
  getBrowserLocation,
  isCep,
  isSaoPauloState,
  isWithinSaoPauloBounds,
  lookupCep,
  suggestAddresses,
  type AddressSuggestion,
} from "@/lib/geocode";
import { submitHelpRequest } from "@/lib/help-requests.functions";
import { fetchCategories, searchNearbyPoints } from "@/lib/points";

export const Route = createFileRoute("/pedir-ajuda")({
  head: () => ({
    meta: [
      { title: "Preciso de ajuda — encontre apoio perto de você | Vem da Gente" },
      {
        name: "description",
        content:
          "Consulte locais de apoio no estado de São Paulo e registre um pedido privado para análise administrativa, sem garantia de encaminhamento.",
      },
      {
        property: "og:title",
        content: "Preciso de ajuda — encontre apoio perto de você | Vem da Gente",
      },
      {
        property: "og:description",
        content:
          "Locais de apoio em São Paulo e registro privado de pedido para análise administrativa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PedirAjudaPage,
});

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];
const RADIUS_KM = 20;

function PedirAjudaPage() {
  const sendHelpRequest = useServerFn(submitHelpRequest);
  const [place, setPlace] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [chosenPlace, setChosenPlace] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const suggestionsBox = useRef<HTMLDivElement>(null);

  const categories = useQuery({ queryKey: ["item-categories"], queryFn: fetchCategories });

  const results = useQuery({
    queryKey: ["help-nearby", coords?.lat, coords?.lng, categoryId],
    queryFn: () => {
      if (!coords) return Promise.resolve([]);
      return searchNearbyPoints({
        lat: coords.lat,
        lng: coords.lng,
        categoryId: categoryId || null,
        radiusKm: RADIUS_KM,
      });
    },
    enabled: coords != null,
  });

  useEffect(() => {
    const term = place.trim();
    if (term.length < 3 || term === chosenPlace) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const found = await suggestAddresses(term);
        if (!cancelled) {
          setSuggestions(found);
          setShowSuggestions(found.length > 0);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [place, chosenPlace]);

  useEffect(() => {
    function closeSuggestions(event: MouseEvent) {
      if (!suggestionsBox.current?.contains(event.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", closeSuggestions);
    return () => document.removeEventListener("mousedown", closeSuggestions);
  }, []);

  function pickSuggestion(suggestion: AddressSuggestion) {
    if (
      !isSaoPauloState(suggestion.state) ||
      !isWithinSaoPauloBounds(suggestion.lat, suggestion.lng)
    ) {
      toast.error("A atuação atual está restrita ao estado de São Paulo.");
      return;
    }
    const label = [suggestion.title, suggestion.subtitle].filter(Boolean).join(" — ");
    setPlace(label);
    setChosenPlace(label);
    setCity(suggestion.city);
    setCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setSuggestions([]);
    setShowSuggestions(false);
    toast.success("Localização encontrada.");
  }

  async function locateFromPlace() {
    if (place.trim().length < 3) {
      toast.error("Escreva sua cidade ou bairro.");
      return;
    }
    setBusy(true);
    try {
      const cepResult = isCep(place) ? await lookupCep(place) : null;
      const found = cepResult ?? (await geocodeAddress(place));
      if (!found) {
        toast.error("Não encontramos esse lugar. Tente um CEP, cidade ou endereço.");
        return;
      }
      setCoords({ lat: found.lat, lng: found.lng });
      if (found.city) setCity(found.city);
      toast.success("Localização encontrada.");
    } catch {
      toast.error("Busca de endereço indisponível agora.");
    } finally {
      setBusy(false);
    }
  }

  async function locateFromBrowser() {
    setBusy(true);
    try {
      const position = await getBrowserLocation();
      if (!isWithinSaoPauloBounds(position.lat, position.lng)) {
        toast.error("Sua localização está fora da área de atuação atual: estado de São Paulo.");
        return;
      }
      setCoords(position);
      const found = await geocodeAddress(`${position.lat},${position.lng}`).catch(() => null);
      if (found?.city) setCity(found.city);
      toast.success("Usando sua localização atual.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao localizar.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanCity = (city || place).trim();
    if (!categoryId) {
      toast.error("Escolha o tipo de ajuda que você precisa.");
      return;
    }
    if (cleanCity.length < 2) {
      toast.error("Informe sua cidade.");
      return;
    }
    if (coords && !isWithinSaoPauloBounds(coords.lat, coords.lng)) {
      toast.error("A atuação atual está restrita ao estado de São Paulo.");
      return;
    }

    setBusy(true);
    try {
      await sendHelpRequest({
        data: {
          category_id: categoryId,
          city: cleanCity,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          note,
          website,
        },
      });
      setSent(true);
      toast.success("Pedido registrado para consulta administrativa.");
    } catch {
      toast.error("Não conseguimos registrar seu pedido agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const points = results.data ?? [];
  const center: [number, number] = coords ? [coords.lat, coords.lng] : DEFAULT_CENTER;

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Preciso de ajuda
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Você não precisa resolver isso sozinho</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Consulte locais publicados no estado de São Paulo e, se desejar, registre um pedido para
          análise pela equipe administrativa autorizada. Não é preciso criar conta.
        </p>

        <AccessibleForm
          onSubmit={submit}
          className="mt-8 space-y-5 rounded-xl border-2 border-border bg-surface p-6"
        >
          <div className="sr-only" aria-hidden="true">
            <Label htmlFor="help-website">Não preencha este campo</Label>
            <Input
              id="help-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="help-category">Que ajuda você precisa *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="help-category" className="mt-2">
                <SelectValue placeholder="Escolha uma opção" />
              </SelectTrigger>
              <SelectContent>
                {(categories.data ?? [])
                  .filter((category) => category.kind !== "money")
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="help-place">Onde você está *</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <div ref={suggestionsBox} className="relative min-w-[16rem] flex-1">
                <Input
                  id="help-place"
                  placeholder="CEP, município, bairro ou endereço em SP"
                  value={place}
                  maxLength={120}
                  autoComplete="postal-code"
                  onFocus={() => setShowSuggestions(suggestions.length > 0)}
                  onChange={(event) => {
                    setPlace(event.target.value);
                    setChosenPlace(null);
                    setCoords(null);
                  }}
                />
                {showSuggestions ? (
                  <div className="absolute top-full right-0 left-0 z-[1000] mt-1 overflow-hidden border-2 border-border bg-popover shadow-md">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="block w-full border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted focus:bg-muted focus:outline-none"
                        onClick={() => pickSuggestion(suggestion)}
                      >
                        <span className="block text-sm font-semibold">{suggestion.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {suggestion.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button type="button" variant="outline" onClick={locateFromPlace} disabled={busy}>
                Buscar no mapa
              </Button>
              <Button type="button" variant="ghost" onClick={locateFromBrowser} disabled={busy}>
                Usar minha localização
              </Button>
            </div>
            {coords ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Localização confirmada{city ? ` — ${city}` : ""}.
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="help-note">Conte um pouco da sua situação (opcional)</Label>
            <Textarea
              id="help-note"
              className="mt-2"
              rows={4}
              maxLength={1000}
              placeholder="Ex.: sou mãe de dois filhos pequenos e preciso de roupas de inverno e cesta básica."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Não escreva documentos, senhas, dados bancários ou informações de saúde. O pedido é
              acessível por você, quando estiver conectado, e pela equipe administrativa autorizada.
            </p>
          </div>

          <div className="border-l-2 border-primary pl-4 text-sm text-muted-foreground">
            O registro serve para organizar solicitações dentro da plataforma. Não há encaminhamento
            automático para instituições, acompanhamento individual nem prazo garantido de resposta
            ou atendimento.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Enviando…" : sent ? "Atualizar pedido" : "Registrar meu pedido"}
            </Button>
            <Button asChild type="button" variant="ghost">
              <Link to="/assistente">Falar com o assistente</Link>
            </Button>
          </div>
        </AccessibleForm>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold">Apoio perto de você</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {coords
              ? `Pontos e instituições em até ${RADIUS_KM} km da sua localização.`
              : "Informe sua localização acima para ver os pontos de apoio mais próximos."}
          </p>

          <div className="mt-5 space-y-5">
            <PointsMap
              center={center}
              zoom={coords ? 12 : 10}
              points={points.map((point) => ({
                id: point.id,
                name: point.name,
                lat: point.lat,
                lng: point.lng,
                subtitle: point.address ?? point.city,
              }))}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <div className="space-y-3">
              {coords && results.isPending ? (
                <p className="text-sm text-muted-foreground">Buscando pontos de apoio…</p>
              ) : coords && results.isError ? (
                <p className="text-sm text-muted-foreground">
                  Não foi possível buscar agora. Tente novamente.
                </p>
              ) : coords && points.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum ponto encontrado nesse raio para essa categoria. Tente outra categoria ou
                  fale com o assistente.
                </p>
              ) : (
                points.map((point) => (
                  <PointCard
                    key={point.id}
                    point={point}
                    context="support"
                    active={selectedId === point.id}
                    onHighlight={setSelectedId}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
