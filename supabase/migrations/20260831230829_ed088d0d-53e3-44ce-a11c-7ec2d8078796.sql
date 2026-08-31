CREATE TABLE public.causes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.causes TO anon;
GRANT SELECT ON public.causes TO authenticated;
GRANT ALL ON public.causes TO service_role;
ALTER TABLE public.causes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Causas visíveis para todos" ON public.causes FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam causas" ON public.causes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.causes (slug, label) VALUES
  ('animais', 'Animais'),
  ('idosos', 'Idosos'),
  ('criancas', 'Crianças'),
  ('vulnerabilidade', 'Pessoas em vulnerabilidade'),
  ('saude', 'Saúde'),
  ('psicossocial', 'Psicossocial'),
  ('meio-ambiente-reciclagem', 'Meio ambiente e reciclagem'),
  ('esporte-cultura', 'Esporte e cultura'),
  ('doacao-de-sangue', 'Doação de sangue');

CREATE TABLE public.point_causes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  point_id UUID NOT NULL REFERENCES public.collection_points(id) ON DELETE CASCADE,
  cause_id UUID NOT NULL REFERENCES public.causes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (point_id, cause_id)
);
GRANT SELECT ON public.point_causes TO anon;
GRANT SELECT, INSERT, DELETE ON public.point_causes TO authenticated;
GRANT ALL ON public.point_causes TO service_role;
ALTER TABLE public.point_causes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Causas dos pontos visíveis para todos" ON public.point_causes FOR SELECT USING (true);
CREATE POLICY "Dono do ponto vincula causas" ON public.point_causes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.collection_points cp WHERE cp.id = point_id AND (cp.claimed_by = auth.uid() OR cp.submitted_by = auth.uid()))
  OR public.is_admin()
);
CREATE POLICY "Dono do ponto remove causas" ON public.point_causes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.collection_points cp WHERE cp.id = point_id AND (cp.claimed_by = auth.uid() OR cp.submitted_by = auth.uid()))
  OR public.is_admin()
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_causes_updated_at BEFORE UPDATE ON public.causes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_point_causes_updated_at BEFORE UPDATE ON public.point_causes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();