CREATE TABLE public.volunteer_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  state text,
  areas text[] NOT NULL DEFAULT '{}',
  availability text,
  experience text,
  motivation text,
  heard_from text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.volunteer_applications TO anon;
GRANT SELECT, UPDATE, DELETE ON public.volunteer_applications TO authenticated;
GRANT ALL ON public.volunteer_applications TO service_role;

ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a volunteer application" ON public.volunteer_applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins can view volunteer applications" ON public.volunteer_applications FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update volunteer applications" ON public.volunteer_applications FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete volunteer applications" ON public.volunteer_applications FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_volunteer_applications_updated_at BEFORE UPDATE ON public.volunteer_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();