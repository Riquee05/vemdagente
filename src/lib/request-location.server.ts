import { formatRequestLocation, type RequestLocation } from "./request-location";
import { createHash } from "node:crypto";
const cache = new Map<string, { expires: number; value: RequestLocation | null }>();
let busy = false;
let nextRequestAt = 0;
/** Consulta pontual administrativa. Sem varrer pedidos nem consultar no carregamento da lista. */
export async function reverseRequestLocation(
  lat: number,
  lng: number,
): Promise<RequestLocation | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const found = cache.get(key);
  if (found && found.expires > Date.now()) return found.value;
  if (busy) throw new Error("Outra localização está sendo consultada. Aguarde e tente novamente.");
  busy = true;
  try {
    const delay = nextRequestAt - Date.now();
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + 1100;
    // Namespace isolado no limitador existente; compartilhado entre instâncias.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allowed, error } = await supabaseAdmin.rpc("consume_request_rate_limit", {
      p_scope: "assistant_question",
      p_identifier_hash: createHash("sha256")
        .update("vemdagente:admin-reverse-geocode:global:v1")
        .digest("hex"),
      p_limit: 1,
      p_window_seconds: 2,
    });
    if (error || !allowed)
      throw new Error("Aguarde alguns segundos e tente identificar a região novamente.");
    const url = new URL(
      process.env["ADMIN_REVERSE_GEOCODE_URL"] || "https://nominatim.openstreetmap.org/reverse",
    );
    url.searchParams.set("lat", lat.toFixed(4));
    url.searchParams.set("lon", lng.toFixed(4));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "17");
    const response = await fetch(url, {
      headers: {
        "User-Agent": "VemDaGente/1.0 (https://www.vemdagente.app)",
        "Accept-Language": "pt-BR",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Consulta de endereço indisponível.");
    const data = (await response.json()) as { address?: Record<string, string> };
    const value = data.address ? formatRequestLocation(data.address) : null;
    if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return value;
  } finally {
    busy = false;
  }
}
