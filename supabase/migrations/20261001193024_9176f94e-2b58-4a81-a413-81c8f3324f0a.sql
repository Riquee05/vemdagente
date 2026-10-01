ALTER TABLE public.collection_points
ADD COLUMN IF NOT EXISTS location_type text;

ALTER TABLE public.collection_points
DROP CONSTRAINT IF EXISTS collection_points_location_type_check;

ALTER TABLE public.collection_points
ADD CONSTRAINT collection_points_location_type_check
CHECK (location_type IS NULL OR location_type IN ('social_organization', 'collection_point', 'support_service', 'confirmed_partner'));

CREATE OR REPLACE FUNCTION public.guard_point_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_admin() THEN
    IF NEW.state IS NOT NULL THEN NEW.state := upper(trim(NEW.state)); END IF;
    RETURN NEW;
  END IF;

  NEW.state := upper(trim(coalesce(NEW.state, '')));
  IF NEW.state <> 'SP' THEN
    RAISE EXCEPTION 'A atuação atual do Vem da Gente está restrita ao estado de São Paulo.';
  END IF;

  IF NEW.lat NOT BETWEEN -25.5 AND -19.5 OR NEW.lng NOT BETWEEN -53.5 AND -44.0 THEN
    RAISE EXCEPTION 'A localização informada não parece estar no estado de São Paulo.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collection_points_guard_scope ON public.collection_points;
CREATE TRIGGER trg_collection_points_guard_scope
BEFORE INSERT OR UPDATE OF state, lat, lng ON public.collection_points
FOR EACH ROW EXECUTE FUNCTION public.guard_point_scope();

DROP POLICY IF EXISTS collection_points_public_select ON public.collection_points;
CREATE POLICY collection_points_public_select
ON public.collection_points FOR SELECT TO anon
USING (
  is_active = true
  AND curation_status = 'verified'
  AND upper(trim(state)) = 'SP'
);

DROP POLICY IF EXISTS collection_points_select ON public.collection_points;
CREATE POLICY collection_points_select
ON public.collection_points FOR SELECT TO authenticated
USING (
  (is_active = true AND curation_status = 'verified' AND upper(trim(state)) = 'SP')
  OR public.is_admin()
  OR claimed_by = auth.uid()
  OR submitted_by = auth.uid()
);

DROP POLICY IF EXISTS point_accepted_items_public_select ON public.point_accepted_items;
CREATE POLICY point_accepted_items_public_select
ON public.point_accepted_items FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.collection_points cp
  WHERE cp.id = point_accepted_items.point_id
    AND cp.is_active = true
    AND cp.curation_status = 'verified'
    AND upper(trim(cp.state)) = 'SP'
));

DROP POLICY IF EXISTS point_accepted_items_select ON public.point_accepted_items;
CREATE POLICY point_accepted_items_select
ON public.point_accepted_items FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_accepted_items.point_id
      AND (
        (cp.is_active = true AND cp.curation_status = 'verified' AND upper(trim(cp.state)) = 'SP')
        OR cp.claimed_by = auth.uid()
        OR cp.submitted_by = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "Causas de pontos publicados" ON public.point_causes;
CREATE POLICY "Causas de pontos publicados"
ON public.point_causes FOR SELECT TO anon, authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_causes.point_id
      AND cp.is_active = true
      AND cp.curation_status = 'verified'
      AND upper(trim(cp.state)) = 'SP'
  )
  OR EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_causes.point_id
      AND (cp.claimed_by = auth.uid() OR cp.submitted_by = auth.uid())
  )
);

DROP POLICY IF EXISTS point_needs_public_select ON public.point_needs;
DROP POLICY IF EXISTS point_needs_select ON public.point_needs;
CREATE POLICY point_needs_public_select
ON public.point_needs FOR SELECT TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_needs.point_id
      AND cp.is_active = true
      AND cp.curation_status = 'verified'
      AND upper(trim(cp.state)) = 'SP'
  )
);
CREATE POLICY point_needs_select
ON public.point_needs FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_needs.point_id
      AND (
        (point_needs.is_active = true AND cp.is_active = true AND cp.curation_status = 'verified' AND upper(trim(cp.state)) = 'SP')
        OR cp.claimed_by = auth.uid()
        OR cp.submitted_by = auth.uid()
      )
  )
);

CREATE OR REPLACE FUNCTION public.search_nearby_points(
  p_lat double precision,
  p_lng double precision,
  p_category_id uuid DEFAULT NULL::uuid,
  p_radius_km double precision DEFAULT 15,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(id uuid, name text, description text, address text, city text, state text, lat double precision, lng double precision, phone text, whatsapp text, website text, photo_url text, opening_hours text, donation_method text, distance_km double precision)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT cp.id, cp.name, cp.description, cp.address, cp.city, cp.state,
    cp.lat, cp.lng, cp.phone, cp.whatsapp, cp.website, cp.photo_url,
    cp.opening_hours, cp.donation_method,
    (6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(p_lat)) * cos(radians(cp.lat)) * cos(radians(cp.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(cp.lat)))))) AS distance_km
  FROM public.collection_points cp
  WHERE cp.is_active = true
    AND cp.curation_status = 'verified'
    AND upper(trim(cp.state)) = 'SP'
    AND (p_category_id IS NULL OR EXISTS (
      SELECT 1 FROM public.point_accepted_items pai
      WHERE pai.point_id = cp.id AND pai.category_id = p_category_id
    ))
    AND (6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(p_lat)) * cos(radians(cp.lat)) * cos(radians(cp.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(cp.lat))))))
      <= greatest(0.1, coalesce(p_radius_km, 15))
  ORDER BY distance_km ASC
  LIMIT least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

REVOKE EXECUTE ON FUNCTION public.guard_point_scope() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_nearby_points(double precision, double precision, uuid, double precision, integer) TO anon, authenticated, service_role;