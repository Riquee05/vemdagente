export type GeocodeResult = {
  label: string;
  city: string;
  state: string | null;
  lat: number;
  lng: number;
};

export type AddressSuggestion = {
  id: string;
  /** Linha principal: rua ou nome do lugar. */
  title: string;
  /** Linha secundária: bairro, cidade/UF e CEP quando disponível. */
  subtitle: string;
  cep: string | null;
  city: string;
  state: string | null;
  lat: number;
  lng: number;
};

const CEP_REGEX = /^\d{5}-?\d{3}$/;

/** Detecta se o texto digitado é um CEP (com ou sem hífen). */
export function isCep(value: string): boolean {
  return CEP_REGEX.test(value.trim());
}

function formatCep(digits: string): string {
  const only = digits.replace(/\D/g, "");
  return only.length === 8 ? `${only.slice(0, 5)}-${only.slice(5)}` : digits;
}

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
};

/** Busca endereço a partir de um CEP (ViaCEP) e geocodifica para lat/lng. */
export async function lookupCep(cep: string): Promise<AddressSuggestion | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) return null;
  const data = (await response.json()) as ViaCepResponse;
  if (data.erro || !data.localidade) return null;

  const parts = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean);
  const geo = await geocodeAddress(parts.join(", ") || `${data.localidade}, ${data.uf}`);
  if (!geo) return null;

  return {
    id: `cep-${digits}`,
    title: data.logradouro || data.localidade,
    subtitle: [data.bairro, `${data.localidade}${data.uf ? ` - ${data.uf}` : ""}`, formatCep(digits)]
      .filter(Boolean)
      .join(" · "),
    cep: formatCep(digits),
    city: data.localidade,
    state: data.uf ?? null,
    lat: geo.lat,
    lng: geo.lng,
  };
}

/** Sugestões de endereço (rua + bairro + cidade + CEP) para autocomplete. */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  if (isCep(trimmed)) {
    const found = await lookupCep(trimmed);
    return found ? [found] : [];
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "br");

  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) return [];

  const results = (await response.json()) as Array<{
    place_id: number;
    display_name: string;
    name?: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
  }>;

  return results.map((item) => {
    const address = item.address ?? {};
    const city =
      address["city"] ?? address["town"] ?? address["village"] ?? address["municipality"] ?? "";
    const state = address["state_code"] ?? address["state"] ?? null;
    const street = address["road"] ?? item.name ?? item.display_name.split(",")[0] ?? "";
    const cep = address["postcode"] ? formatCep(address["postcode"]) : null;
    const neighborhood = address["suburb"] ?? address["neighbourhood"] ?? null;

    return {
      id: String(item.place_id),
      title: street || city || item.display_name,
      subtitle: [neighborhood, city && state ? `${city} - ${state}` : city, cep]
        .filter(Boolean)
        .join(" · "),
      cep,
      city,
      state,
      lat: Number(item.lat),
      lng: Number(item.lon),
    };
  });
}

/** Geocodificação gratuita (OpenStreetMap/Nominatim) para cidade, endereço ou CEP. */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;


  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");

  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) return null;

  const results = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
  }>;
  const first = results[0];
  if (!first) return null;

  const address = first.address ?? {};
  return {
    label: first.display_name,
    city: address["city"] ?? address["town"] ?? address["village"] ?? address["municipality"] ?? "",
    state: address["state"] ?? null,
    lat: Number(first.lat),
    lng: Number(first.lon),
  };
}

/** Localização do navegador. */
export function getBrowserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalização não disponível neste navegador."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error("Não conseguimos acessar sua localização.")),
      { timeout: 10000 },
    );
  });
}
