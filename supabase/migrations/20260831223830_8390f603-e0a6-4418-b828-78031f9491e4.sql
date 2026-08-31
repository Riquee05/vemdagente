CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role_title text NOT NULL DEFAULT 'Voluntário',
  areas text[] NOT NULL DEFAULT '{}'::text[],
  city text,
  state text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  joined_at date NOT NULL DEFAULT current_date,
  application_id uuid REFERENCES public.volunteer_applications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX team_members_email_key ON public.team_members (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_members_select ON public.team_members FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY team_members_insert ON public.team_members FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY team_members_update ON public.team_members FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY team_members_delete ON public.team_members FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_team_members_updated_at BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.volunteer_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.volunteer_applications(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX volunteer_stage_events_application_idx ON public.volunteer_stage_events (application_id, created_at DESC);

GRANT SELECT, INSERT ON public.volunteer_stage_events TO authenticated;
GRANT ALL ON public.volunteer_stage_events TO service_role;

ALTER TABLE public.volunteer_stage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY volunteer_stage_events_select ON public.volunteer_stage_events FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY volunteer_stage_events_insert ON public.volunteer_stage_events FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE TRIGGER trg_volunteer_stage_events_updated_at BEFORE UPDATE ON public.volunteer_stage_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();