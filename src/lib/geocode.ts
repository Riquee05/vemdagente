export type GeocodeResult = {
  label: string;
  city: string;
  state: string | null;
  lat: number;
  lng: number;
};

/** Geocodificação gratuita (OpenStreetMap/Nominatim) para cidade ou endereço. */
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
