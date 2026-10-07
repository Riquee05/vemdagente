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

export function isSaoPauloState(state: string | null | undefined): boolean {
  if (!state) return false;
  const normalized = state
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  return normalized === "SP" || normalized === "SAO PAULO";
}

export function isWithinSaoPauloBounds(lat: number, lng: number): boolean {
  return lat >= -25.35 && lat <= -19.75 && lng >= -53.2 && lng <= -44.0;
}

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
  if (!response.ok) throw new Error("Consulta de CEP indisponível. Tente novamente mais tarde.");
  const data = (await response.json()) as ViaCepResponse;
  if (data.erro || !data.localidade || !isSaoPauloState(data.uf)) return null;

  // A neighborhood appended to the street can make a valid address fail to match.
  const parts = [data.logradouro, data.localidade, data.uf, "Brasil"].filter(Boolean);
  const geo = await geocodeAddress(parts.join(", "));
  if (!geo)
    throw new Error(
      `CEP válido: ${parts.slice(0, -1).join(", ")}. Não conseguimos localizar o endereço no mapa. Digite a rua e ajuste o pino.`,
    );

  return {
    id: `cep-${digits}`,
    title: data.logradouro || data.localidade,
    subtitle: [
      data.bairro,
      `${data.localidade}${data.uf ? ` - ${data.uf}` : ""}`,
      formatCep(digits),
    ]
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
  url.searchParams.set("viewbox", "-53.2,-19.75,-44,-25.35");
  url.searchParams.set("bounded", "1");

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

  return results
    .map((item) => {
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
    })
    .filter((item) => isSaoPauloState(item.state) && isWithinSaoPauloBounds(item.lat, item.lng));
}

/** Geocodificação gratuita (OpenStreetMap/Nominatim) para cidade, endereço ou CEP. */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  if (isCep(trimmed)) {
    url.searchParams.set("postalcode", trimmed.replace(/\D/g, ""));
  } else {
    url.searchParams.set("q", trimmed);
  }

  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("viewbox", "-53.2,-19.75,-44,-25.35");
  url.searchParams.set("bounded", "1");

  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok)
    throw new Error(
      "Serviço de localização indisponível. Tente novamente ou ajuste o pino no mapa.",
    );

  const results = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
  }>;
  const first = results[0];
  if (!first) return null;

  const address = first.address ?? {};
  const result = {
    label: first.display_name,
    city: address["city"] ?? address["town"] ?? address["village"] ?? address["municipality"] ?? "",
    state: address["state"] ?? null,
    lat: Number(first.lat),
    lng: Number(first.lon),
  };
  return isSaoPauloState(result.state) && isWithinSaoPauloBounds(result.lat, result.lng)
    ? result
    : null;
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
