import { createClient } from "@supabase/supabase-js";
import type { NearbyPoint } from "@/lib/points";
import type { AssistantAnswer } from "@/lib/assistant.functions";
import {
  type GuidedSearch,
  GUIDED_PAGE_SIZE,
  NEARBY_LIMIT,
  literalSearch,
  guidedSearchReply,
} from "@/lib/guided-search";

export async function runGuidedSearch(data: GuidedSearch): Promise<AssistantAnswer> {
  const { enforceRateLimit, rateLimitConfig } = await import("@/lib/rate-limit.server");
  await enforceRateLimit("assistant_question", rateLimitConfig("ASSISTANT"));
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("A busca está temporariamente indisponível. Tente novamente.");
  // Anonymous client keeps the public RLS policies in force.
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let points: NearbyPoint[];
  let total: number;
  let limited = false;
  if (data.location) {
    const { data: nearby, error } = await supabase.rpc("search_nearby_points", {
      p_lat: data.location.lat,
      p_lng: data.location.lng,
      p_radius_km: data.location.radiusKm,
      p_limit: NEARBY_LIMIT,
      ...(data.categoryId ? { p_category_id: data.categoryId } : {}),
    });
    if (error) throw new Error("Não foi possível consultar os locais. Tente novamente.");
    const publicPoints = ((nearby ?? []) as NearbyPoint[]).filter((point) => point.state === "SP");
    total = publicPoints.length;
    limited = total === NEARBY_LIMIT;
    points = publicPoints.slice((data.page - 1) * GUIDED_PAGE_SIZE, data.page * GUIDED_PAGE_SIZE);
  } else {
    const fields =
      "id, name, description, address, city, state, lat, lng, phone, whatsapp, website, photo_url, opening_hours, donation_method, confirmation_status, confirmed_at";
    let query = supabase
      .from("collection_points")
      .select(data.categoryId ? `${fields}, point_accepted_items!inner(category_id)` : fields, {
        count: "exact",
      })
      .eq("is_active", true)
      .eq("curation_status", "verified")
      .eq("state", "SP");
    if (data.categoryId) query = query.eq("point_accepted_items.category_id", data.categoryId);
    const city = literalSearch(data.city);
    const neighborhood = literalSearch(data.neighborhood);
    if (city) query = query.ilike("city", `%${city}%`);
    if (neighborhood) query = query.ilike("address", `%${neighborhood}%`);
    const {
      data: rows,
      count,
      error,
    } = await query
      .order("name")
      .order("id")
      .range((data.page - 1) * GUIDED_PAGE_SIZE, data.page * GUIDED_PAGE_SIZE - 1);
    if (error) throw new Error("Não foi possível consultar os locais. Tente novamente.");
    points = ((rows ?? []) as unknown as NearbyPoint[]).map((point) => ({
      ...point,
      distance_km: null,
    }));
    total = count ?? 0;
  }
  return { points, total, limited, page: data.page, reply: guidedSearchReply(total, limited) };
}
