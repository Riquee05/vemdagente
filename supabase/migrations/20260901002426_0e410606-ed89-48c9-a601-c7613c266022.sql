CREATE TABLE public.admin_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid REFERENCES public.volunteer_applications(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_invites_status_check CHECK (status IN ('pending','used','revoked','expired'))
);

GRANT ALL ON public.admin_invites TO service_role;
GRANT SELECT ON public.admin_invites TO authenticated;

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente o dono vê os convites"
ON public.admin_invites FOR SELECT TO authenticated
USING (public.is_owner(auth.uid()));

CREATE UNIQUE INDEX admin_invites_pending_email_idx
ON public.admin_invites (lower(email)) WHERE status = 'pending';

CREATE INDEX admin_invites_application_idx ON public.admin_invites (application_id);

CREATE TRIGGER trg_admin_invites_updated_at
BEFORE UPDATE ON public.admin_invites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();