import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { PointDetail } from "@/lib/points";

type PointDetailResult =
  | { status: "available"; point: PointDetail }
  | { status: "unavailable" | "not_found"; point: null };

export const getPublicPointDetail = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().trim().max(100) }).parse(data))
  .handler(async ({ data }): Promise<PointDetailResult> => {
    if (!z.string().uuid().safeParse(data.id).success) return { status: "not_found", point: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("collection_points")
      .select(
        `id, name, description, address, city, state, lat, lng, phone, whatsapp, website, photo_url,
         opening_hours, donation_method, curation_status, source, confirmation_status, confirmed_at,
         donation_hours, is_active, location_type,
         point_accepted_items ( confirmed_at, item_categories ( id, slug, label, kind ) ),
         point_causes ( causes ( id, slug, label ) ),
         point_needs ( id, urgency, note, is_active, updated_at, item_categories ( id, slug, label, kind ) )`,
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar ficha pública:", error);
      throw new Error("Falha temporária ao carregar o local.");
    }
    if (!row) return { status: "not_found", point: null };
    if (!row.is_active || row.curation_status !== "verified" || row.state?.trim().toUpperCase() !== "SP") {
      return { status: "unavailable", point: null };
    }

    const raw = row as Record<string, any>;
    const point: PointDetail = {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      address: raw.address,
      city: raw.city,
      state: raw.state,
      lat: raw.lat,
      lng: raw.lng,
      phone: raw.phone,
      whatsapp: raw.whatsapp,
      website: raw.website,
      photo_url: raw.photo_url,
      opening_hours: raw.opening_hours,
      donation_method: raw.donation_method,
      distance_km: null,
      curation_status: raw.curation_status,
      source: raw.source,
      confirmation_status: raw.confirmation_status,
      confirmed_at: raw.confirmed_at,
      donation_hours: raw.donation_hours,
      location_type: raw.location_type,
      accepted: (raw.point_accepted_items ?? [])
        .filter((item: any) => item.item_categories)
        .map((item: any) => ({ ...item.item_categories, confirmed_at: item.confirmed_at ?? null })),
      causes: (raw.point_causes ?? []).map((item: any) => item.causes).filter(Boolean),
      needs: (raw.point_needs ?? [])
        .filter((need: any) => need.is_active && need.item_categories)
        .map((need: any) => ({
          id: need.id,
          urgency: need.urgency,
          note: need.note,
          updated_at: need.updated_at,
          category: need.item_categories,
        })),
    };
    return { status: "available", point };
  });