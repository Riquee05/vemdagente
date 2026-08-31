ALTER TABLE public.collection_points
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collection_points_submitted_by ON public.collection_points (submitted_by);

DROP POLICY IF EXISTS collection_points_select ON public.collection_points;
CREATE POLICY collection_points_select ON public.collection_points
FOR SELECT
USING (
  ((is_active = true) AND (curation_status = 'verified'))
  OR public.is_admin()
  OR (claimed_by = auth.uid())
  OR (submitted_by = auth.uid())
);

DROP POLICY IF EXISTS collection_points_insert ON public.collection_points;
CREATE POLICY collection_points_insert ON public.collection_points
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (submitted_by = auth.uid() AND curation_status = 'pending' AND is_active = true)
);

DROP POLICY IF EXISTS collection_points_update ON public.collection_points;
CREATE POLICY collection_points_update ON public.collection_points
FOR UPDATE
USING (public.is_admin() OR claimed_by = auth.uid() OR (submitted_by = auth.uid() AND curation_status = 'pending'))
WITH CHECK (public.is_admin() OR claimed_by = auth.uid() OR (submitted_by = auth.uid() AND curation_status = 'pending'));

CREATE OR REPLACE FUNCTION public.search_nearby_points(
  p_lat double precision,
  p_lng double precision,
  p_category_id uuid DEFAULT NULL,
  p_radius_km double precision DEFAULT 15,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  address text,
  city text,
  state text,
  lat double precision,
  lng double precision,
  phone text,
  whatsapp text,
  website text,
  photo_url text,
  opening_hours text,
  donation_method text,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.id, cp.name, cp.description, cp.address, cp.city, cp.state,
    cp.lat, cp.lng, cp.phone, cp.whatsapp, cp.website, cp.photo_url,
    cp.opening_hours, cp.donation_method,
    (6371 * acos(
      least(1.0, greatest(-1.0,
        cos(radians(p_lat)) * cos(radians(cp.lat)) * cos(radians(cp.lng) - radians(p_lng))
        + sin(radians(p_lat)) * sin(radians(cp.lat))
      ))
    )) AS distance_km
  FROM public.collection_points cp
  WHERE cp.is_active = true
    AND cp.curation_status = 'verified'
    AND (
      p_category_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.point_accepted_items pai
        WHERE pai.point_id = cp.id AND pai.category_id = p_category_id
      )
    )
    AND (6371 * acos(
      least(1.0, greatest(-1.0,
        cos(radians(p_lat)) * cos(radians(cp.lat)) * cos(radians(cp.lng) - radians(p_lng))
        + sin(radians(p_lat)) * sin(radians(cp.lat))
      ))
    )) <= greatest(0.1, coalesce(p_radius_km, 15))
  ORDER BY distance_km ASC
  LIMIT least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

REVOKE ALL ON FUNCTION public.search_nearby_points(double precision, double precision, uuid, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_nearby_points(double precision, double precision, uuid, double precision, integer) TO anon, authenticated, service_role;