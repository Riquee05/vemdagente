ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_activated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_id_key
  ON public.team_members (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_permissions_check CHECK (
    permissions <@ ARRAY[
      'points_review',
      'needs_management',
      'volunteer_management',
      'help_support',
      'content_management'
    ]::text[]
  );

CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_by uuid,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_invites_status_check CHECK (status IN ('pending','used','revoked','expired')),
  CONSTRAINT team_invites_attempts_check CHECK (attempts BETWEEN 0 AND 5)
);

GRANT SELECT ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_invites_admin_select
ON public.team_invites FOR SELECT TO authenticated
USING (public.is_admin());

CREATE UNIQUE INDEX team_invites_pending_member_idx
ON public.team_invites (team_member_id) WHERE status = 'pending';

CREATE INDEX team_invites_email_idx ON public.team_invites (lower(email));

CREATE TRIGGER trg_team_invites_updated_at
BEFORE UPDATE ON public.team_invites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS help_requests_assigned_to_idx
  ON public.help_requests (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_active_team_member(_user_id uuid DEFAULT auth.uid())
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

CREATE OR REPLACE FUNCTION public.has_team_permission(
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

REVOKE EXECUTE ON FUNCTION public.is_active_team_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_team_member(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_team_permission(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_team_permission(text, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS team_members_select ON public.team_members;
CREATE POLICY team_members_select ON public.team_members
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR public.has_team_permission('volunteer_management', auth.uid())
);

DROP POLICY IF EXISTS team_members_insert ON public.team_members;
CREATE POLICY team_members_insert ON public.team_members
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS team_members_update ON public.team_members;
CREATE POLICY team_members_update ON public.team_members
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS team_members_delete ON public.team_members;
CREATE POLICY team_members_delete ON public.team_members
FOR DELETE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS help_requests_select ON public.help_requests;
CREATE POLICY help_requests_select ON public.help_requests
FOR SELECT TO authenticated
USING (
  requester_id = auth.uid()
  OR public.is_admin()
  OR (
    public.has_team_permission('help_support', auth.uid())
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
    public.has_team_permission('help_support', auth.uid())
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
    public.has_team_permission('help_support', auth.uid())
    AND assigned_to IN (
      SELECT tm.id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  )
);

CREATE OR REPLACE FUNCTION public.guard_team_member_access_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.last_activated_at IS DISTINCT FROM OLD.last_activated_at THEN
    RAISE EXCEPTION 'Somente a administração pode alterar o acesso do colaborador.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_team_members_guard_access
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.guard_team_member_access_fields();