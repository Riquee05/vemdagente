-- dono atual
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT u.id, 'owner'::public.app_role, u.id
FROM auth.users u
WHERE replace(split_part(lower(u.email), '@', 1), '.', '') = 'rickaikal83'
  AND split_part(lower(u.email), '@', 2) = 'gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role::text = 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

-- normalizar comparação de e-mail do dono em novos cadastros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'donor');

  if replace(split_part(lower(coalesce(new.email, '')), '@', 1), '.', '') = 'rickaikal83'
     and split_part(lower(coalesce(new.email, '')), '@', 2) = 'gmail.com'
     and not exists (select 1 from public.user_roles where role::text = 'owner') then
    insert into public.user_roles (user_id, role, granted_by)
    values (new.id, 'owner', new.id)
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

-- funções de gatilho não devem ser chamáveis pela API
REVOKE ALL ON FUNCTION public.enforce_single_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;