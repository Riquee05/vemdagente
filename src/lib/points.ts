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

/** Busca por proximidade — só pontos ativos, verificados e que aceitam o item. */
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

/** Lista pública de pontos verificados (sem localização informada). */
export async function fetchVerifiedPoints(city?: string): Promise<NearbyPoint[]> {
  let query = supabase
    .from("collection_points")
    .select(
      "id, name, description, address, city, state, lat, lng, phone, whatsapp, website, photo_url, opening_hours, donation_method",
    )
    .eq("is_active", true)
    .eq("curation_status", "verified")
    .order("name")
    .limit(1500);

  if (city && city.trim()) query = query.ilike("city", `%${city.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, distance_km: null }));
}

export type PointDetail = NearbyPoint & {
  curation_status: string;
  accepted: ItemCategory[];
  causes: Cause[];
  needs: { id: string; urgency: string; note: string | null; category: ItemCategory }[];
};

export async function fetchPoint(id: string): Promise<PointDetail | null> {
  const { data, error } = await supabase
    .from("collection_points")
    .select(
      `id, name, description, address, city, state, lat, lng, phone, whatsapp, website, photo_url,
       opening_hours, donation_method, curation_status,
       point_accepted_items ( item_categories ( id, slug, label, kind ) ),
       point_causes ( causes ( id, slug, label ) ),
       point_needs ( id, urgency, note, is_active, item_categories ( id, slug, label, kind ) )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const raw = data as Record<string, any>;
  return {
    ...(raw as NearbyPoint),
    distance_km: null,
    curation_status: raw['curation_status'],
    accepted: (raw['point_accepted_items'] ?? [])
      .map((r: any) => r.item_categories)
      .filter(Boolean) as ItemCategory[],
    causes: (raw['point_causes'] ?? [])
      .map((r: any) => r.causes)
      .filter(Boolean) as Cause[],
    needs: (raw['point_needs'] ?? [])
      .filter((n: any) => n.is_active && n.item_categories)
      .map((n: any) => ({
        id: n.id,
        urgency: n.urgency,
        note: n.note,
        category: n.item_categories as ItemCategory,
      })),
  };
}

/** Resolve o caminho salvo no storage para uma URL assinada exibível. */
export async function resolvePhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
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

/** Necessidades ativas de uma lista de pontos (leitura pública). */
export async function fetchActiveNeedsByPointIds(
  pointIds: string[],
): Promise<{ point_id: string; urgency: string; category_label: string; note: string | null }[]> {
  if (pointIds.length === 0) return [];
  const { data, error } = await supabase
    .from("point_needs")
    .select("point_id, urgency, note, item_categories ( label )")
    .in("point_id", pointIds)
    .eq("is_active", true)
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    point_id: row.point_id,
    urgency: row.urgency,
    category_label: row.item_categories?.label ?? "",
    note: row.note,
  }));
}
