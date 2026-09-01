GRANT INSERT ON public.volunteer_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_applications TO authenticated;
GRANT ALL ON public.volunteer_applications TO service_role;