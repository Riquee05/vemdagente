CREATE OR REPLACE FUNCTION public.consume_request_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  IF p_scope NOT IN ('help_request', 'volunteer_application', 'assistant_question', 'team_invite_activation')
     OR length(p_identifier_hash) <> 64
     OR p_limit < 1
     OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Parâmetros de limitação inválidos.';
  END IF;

  DELETE FROM public.request_rate_limits WHERE expires_at <= now();

  INSERT INTO public.request_rate_limits AS limits (
    scope, identifier_hash, request_count, expires_at, updated_at
  ) VALUES (
    p_scope, p_identifier_hash, 1, now() + make_interval(secs => p_window_seconds), now()
  )
  ON CONFLICT (scope, identifier_hash) DO UPDATE SET
    request_count = CASE
      WHEN limits.expires_at <= now() THEN 1
      ELSE limits.request_count + 1
    END,
    expires_at = CASE
      WHEN limits.expires_at <= now() THEN now() + make_interval(secs => p_window_seconds)
      ELSE limits.expires_at
    END,
    updated_at = now()
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

DROP POLICY IF EXISTS collection_points_select ON public.collection_points;
CREATE POLICY collection_points_select ON public.collection_points
FOR SELECT TO authenticated
USING (
  (is_active = true AND curation_status = 'verified')
  OR public.is_admin()
  OR claimed_by = auth.uid()
  OR submitted_by = auth.uid()
  OR private.has_team_permission('points_review', auth.uid())
  OR private.has_team_permission('needs_management', auth.uid())
);

DROP POLICY IF EXISTS point_corrections_select ON public.point_corrections;
CREATE POLICY point_corrections_select ON public.point_corrections
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR submitted_by = auth.uid()
  OR private.has_team_permission('points_review', auth.uid())
);

DROP POLICY IF EXISTS point_needs_select ON public.point_needs;
CREATE POLICY point_needs_select ON public.point_needs
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR private.has_team_permission('needs_management', auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_id
      AND (
        (cp.is_active = true AND cp.curation_status = 'verified')
        OR cp.claimed_by = auth.uid()
        OR cp.submitted_by = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS point_needs_insert ON public.point_needs;
CREATE POLICY point_needs_insert ON public.point_needs
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR private.has_team_permission('needs_management', auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_id AND cp.claimed_by = auth.uid()
  )
);

DROP POLICY IF EXISTS point_needs_update ON public.point_needs;
CREATE POLICY point_needs_update ON public.point_needs
FOR UPDATE TO authenticated
USING (
  public.is_admin()
  OR private.has_team_permission('needs_management', auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_id AND cp.claimed_by = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR private.has_team_permission('needs_management', auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_id AND cp.claimed_by = auth.uid()
  )
);

DROP POLICY IF EXISTS point_needs_delete ON public.point_needs;
CREATE POLICY point_needs_delete ON public.point_needs
FOR DELETE TO authenticated
USING (
  public.is_admin()
  OR private.has_team_permission('needs_management', auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.collection_points cp
    WHERE cp.id = point_id AND cp.claimed_by = auth.uid()
  )
);

DROP POLICY IF EXISTS volunteer_applications_select ON public.volunteer_applications;
CREATE POLICY volunteer_applications_select ON public.volunteer_applications
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR private.has_team_permission('volunteer_management', auth.uid())
);

DROP POLICY IF EXISTS volunteer_stage_events_select ON public.volunteer_stage_events;
CREATE POLICY volunteer_stage_events_select ON public.volunteer_stage_events
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR private.has_team_permission('volunteer_management', auth.uid())
);

CREATE OR REPLACE FUNCTION public.guard_help_request_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     AND NOT public.is_admin()
     AND NOT private.has_team_permission('volunteer_management', auth.uid()) THEN
    RAISE EXCEPTION 'Somente a administração ou gestor autorizado pode atribuir atendimentos.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_help_request_assignment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_help_request_assignment() TO service_role;

CREATE TRIGGER trg_help_requests_guard_assignment
BEFORE UPDATE ON public.help_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_help_request_assignment();