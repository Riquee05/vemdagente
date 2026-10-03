CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_active_team_member(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'volunteer'
    WHERE tm.user_id = _user_id AND tm.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION private.has_team_permission(
  _permission text,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT _permission = ANY(tm.permissions)
    FROM public.team_members tm
    JOIN public.user_roles ur ON ur.user_id = tm.user_id AND ur.role = 'volunteer'
    WHERE tm.user_id = _user_id AND tm.status = 'active'
    LIMIT 1
  ), false)
$$;

REVOKE ALL ON FUNCTION private.is_active_team_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_team_permission(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_team_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_team_permission(text, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS team_members_select ON public.team_members;
CREATE POLICY team_members_select ON public.team_members
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR private.has_team_permission('volunteer_management', auth.uid())
);

DROP POLICY IF EXISTS help_requests_select ON public.help_requests;
CREATE POLICY help_requests_select ON public.help_requests
FOR SELECT TO authenticated
USING (
  requester_id = auth.uid()
  OR public.is_admin()
  OR (
    private.has_team_permission('help_support', auth.uid())
    AND assigned_to IN (
      SELECT tm.id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS help_requests_update ON public.help_requests;
CREATE POLICY help_requests_update ON public.help_requests
FOR UPDATE TO authenticated
USING (
  requester_id = auth.uid()
  OR public.is_admin()
  OR (
    private.has_team_permission('help_support', auth.uid())
    AND assigned_to IN (
      SELECT tm.id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
)
WITH CHECK (
  requester_id = auth.uid()
  OR public.is_admin()
  OR (
    private.has_team_permission('help_support', auth.uid())
    AND assigned_to IN (
      SELECT tm.id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
);

REVOKE ALL ON FUNCTION public.guard_team_member_access_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_team_member_access_fields() TO service_role;

DROP FUNCTION public.is_active_team_member(uuid);
DROP FUNCTION public.has_team_permission(text, uuid);