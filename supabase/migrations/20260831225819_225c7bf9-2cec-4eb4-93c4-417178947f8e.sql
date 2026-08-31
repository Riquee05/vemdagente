-- Funções de gatilho não devem ser chamáveis pela API
revoke all on function public.set_updated_at() from anon, authenticated;
revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.prevent_profile_role_escalation() from anon, authenticated;

-- Primeiro admin: só usuários autenticados
revoke all on function public.claim_first_admin() from anon;
grant execute on function public.claim_first_admin() to authenticated;

-- Verificação de papéis: necessária nas políticas RLS (avaliadas como o papel do chamador)
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to anon, authenticated;

-- Busca pública de pontos aprovados
grant execute on function public.search_nearby_points(double precision, double precision, uuid, double precision, integer) to anon, authenticated;
