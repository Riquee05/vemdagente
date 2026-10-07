import { isNeedCurrent } from "@/lib/need-validity";
import { supabase } from "@/integrations/supabase/client";

export type ItemCategory = {
  id: string;
  slug: string;
  label: string;
  kind: string;
};

export type Cause = {
  id: string;
  slug: string;
  label: string;
};

/** Causas atendidas pela plataforma (leitura pública). */
export async function fetchCauses(): Promise<Cause[]> {
  const { data, error } = await supabase.from("causes").select("id, slug, label").order("label");
  if (error) throw error;
  return data ?? [];
}

export type NearbyPoint = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string;
  state: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  photo_url: string | null;
  opening_hours: string | null;
  donation_method: string | null;
  distance_km: number | null;
  confirmation_status?: string | null;
  confirmed_at?: string | null;
};

export const PHOTO_BUCKET = "point-photos";

/** Categorias de itens (leitura pública). */
export async function fetchCategories(): Promise<ItemCategory[]> {
  const { data, error } = await supabase
    .from("item_categories")
    .select("id, slug, label, kind")
    .order("label");
  if (error) throw error;
  return data ?? [];
}

/** Busca por proximidade — só pontos ativos, publicados e que aceitam o item. */
export async function searchNearbyPoints(params: {
  lat: number;
  lng: number;
  categoryId?: string | null;
  radiusKm?: number;
}): Promise<NearbyPoint[]> {
  const { data, error } = await supabase.rpc("search_nearby_points", {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_km: params.radiusKm ?? 15,
    p_limit: 60,
    ...(params.categoryId ? { p_category_id: params.categoryId } : {}),
  });
  if (error) throw error;
  return (data ?? []) as NearbyPoint[];
}

/** Lista pública de pontos aprovados para exibição (sem localização informada). */
export async function fetchVerifiedPoints(city?: string): Promise<NearbyPoint[]> {
  let query = supabase
    .from("collection_points")
    .select(
      "id, name, description, address, city, state, lat, lng, phone, whatsapp, website, photo_url, opening_hours, donation_method, confirmation_status, confirmed_at",
    )
    .eq("is_active", true)
    .eq("curation_status", "verified")
    .eq("state", "SP")
    .order("name")
    .limit(1500);

  if (city && city.trim()) query = query.ilike("city", `%${city.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, distance_km: null }));
}

/** Página pública: filtros e paginação executados pelo banco, sob RLS. */
export async function fetchVerifiedPointsPage(params: {
  city: string;
  causeId: string;
  page: number;
  signal?: AbortSignal;
  neighborhood?: string;
  location?: { lat: number; lng: number; radiusKm: number } | undefined;
}): Promise<{ points: NearbyPoint[]; total: number }> {
  if (params.location) {
    const { data, error } = await supabase
      .rpc("search_public_points_page", {
        p_lat: params.location.lat,
        p_lng: params.location.lng,
        p_radius: params.location.radiusKm,
        p_city: params.city,
        p_neighborhood: params.neighborhood ?? "",
        p_cause: params.causeId === "all" ? null : params.causeId,
        p_page: params.page,
      })
      .abortSignal(params.signal ?? new AbortController().signal);
    if (error) throw error;
    return data as { points: NearbyPoint[]; total: number };
  }
  const fields =
    "id, name, description, address, city, state, lat, lng, phone, whatsapp, website, photo_url, opening_hours, donation_method, confirmation_status, confirmed_at";
  let query = supabase
    .from("collection_points")
    .select(params.causeId === "all" ? fields : `${fields}, point_causes!inner(cause_id)`, {
      count: "exact",
    })
    .eq("is_active", true)
    .eq("curation_status", "verified")
    .eq("state", "SP");
  const city = params.city.trim().replace(/[%_\\]/g, "");
  if (city) query = query.ilike("city", `%${city}%`);
  const neighborhood = (params.neighborhood ?? "").trim().replace(/[%_\\]/g, "");
  if (neighborhood) query = query.ilike("address", `%${neighborhood}%`);
  if (params.causeId !== "all") query = query.eq("point_causes.cause_id", params.causeId);
  query = query
    .order("name")
    .order("id")
    .range((params.page - 1) * 30, params.page * 30 - 1);
  if (params.signal) query = query.abortSignal(params.signal);
  const { data, count, error } = await query;
  if (error) throw error;
  return {
    points: ((data ?? []) as unknown as NearbyPoint[]).map((point) => ({
      ...point,
      distance_km: null,
    })),
    total: count ?? 0,
  };
}

export type PointDetail = NearbyPoint & {
  curation_status: string;
  source: string;
  confirmation_status: string;
  confirmed_at: string | null;
  donation_hours: string | null;
  location_type: string;
  accepted: (ItemCategory & { confirmed_at: string | null })[];
  causes: Cause[];
  needs: {
    id: string;
    urgency: string;
    note: string | null;
    updated_at: string;
    expires_at: string | null;
    category: ItemCategory;
  }[];
};

export const SOURCE_LABELS: Record<string, string> = {
  google_maps: "Dados públicos do Google Maps",
  manual: "Indicação da comunidade",
  self_claimed: "Cadastrado pela própria instituição",
};

export const CONFIRMATION_LABELS: Record<string, string> = {
  unconfirmed: "Não confirmado",
  confirmed: "Recebimento de doações confirmado",
  needs_update: "Precisa de atualização",
};

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  social_organization: "Instituição ou organização social",
  collection_point: "Ponto de coleta",
  support_service: "Serviço ou rede de apoio",
  partner_business: "Empresa parceira",
};

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("pt-BR");
}

export function formatDistance(km: number | null): string | null {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** IDs dos pontos que atendem uma causa (leitura pública). */
export async function fetchPointIdsByCause(causeId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("point_causes")
    .select("point_id")
    .eq("cause_id", causeId)
    .limit(3000);
  if (error) throw error;
  return (data ?? []).map((row) => row.point_id);
}

/** IDs dos pontos que atendem qualquer uma das causas informadas (união). */
export async function fetchPointIdsByCauses(causeIds: string[]): Promise<string[]> {
  if (causeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("point_causes")
    .select("point_id")
    .in("cause_id", causeIds)
    .limit(5000);
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => row.point_id)));
}

/**
 * Extrai o bairro de um endereço no formato brasileiro
 * ("Rua X, 123 - Bairro, Cidade - UF, CEP").
 */
export function extractNeighborhood(address: string | null, city?: string | null): string | null {
  if (!address) return null;
  let head = address;
  if (city) {
    const idx = head.indexOf(`, ${city}`);
    if (idx > 0) head = head.slice(0, idx);
  } else {
    head = head.split(",")[0] ?? head;
  }
  const parts = head
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  if (!last || /^\d/.test(last) || last.length < 3) return null;
  return last;
}

/** Necessidades ativas de uma lista de pontos (leitura pública). */
export async function fetchActiveNeedsByPointIds(pointIds: string[]): Promise<
  {
    point_id: string;
    urgency: string;
    category_label: string;
    note: string | null;
    updated_at: string;
  }[]
> {
  if (pointIds.length === 0) return [];
  let { data, error } = await supabase
    .from("point_needs")
    .select("point_id, urgency, note, updated_at, expires_at, item_categories ( label )")
    .in("point_id", pointIds)
    .eq("is_active", true)
    .limit(500);
  if (error?.code === "42703") {
    const fallback = await supabase
      .from("point_needs")
      .select("point_id, urgency, note, updated_at, item_categories ( label )")
      .in("point_id", pointIds)
      .eq("is_active", true)
      .limit(500);
    data = fallback.data?.map((need) => ({ ...need, expires_at: null })) ?? null;
    error = fallback.error;
  }
  if (error) throw error;
  return (data ?? [])
    .filter((row) => isNeedCurrent(row.expires_at))
    .map((row) => ({
      point_id: row.point_id,
      urgency: row.urgency,
      category_label: row.item_categories?.label ?? "",
      note: row.note,
      updated_at: row.updated_at,
    }));
}
