-- 1) novo papel owner
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- 2) só um owner (garantido por trigger, pois o predicado de índice exigiria função imutável)
CREATE OR REPLACE FUNCTION public.enforce_single_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if new.role::text = 'owner'
     and exists (
       select 1 from public.user_roles
       where role::text = 'owner' and user_id <> new.user_id
     ) then
    raise exception 'Já existe um dono para esta plataforma.';
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_single_owner ON public.user_roles;
CREATE TRIGGER trg_user_roles_single_owner
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_owner();

-- 3) funções
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role::text = 'owner'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role::text in ('admin', 'owner')
  )
$$;

REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated, service_role;

-- 4) o app não mexe mais em papéis: só o owner, e nunca em linhas owner
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;

CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_roles_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() AND role::text <> 'owner');

CREATE POLICY user_roles_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_owner() AND role::text <> 'owner')
  WITH CHECK (public.is_owner() AND role::text <> 'owner');

CREATE POLICY user_roles_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_owner() AND role::text <> 'owner');

-- 5) fim do "assumir administração"
DROP FUNCTION IF EXISTS public.claim_first_admin();

-- 6) owner automático no primeiro login do e-mail responsável
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'donor');

  if lower(coalesce(new.email, '')) = 'rickaikal.83@gmail.com'
     and not exists (select 1 from public.user_roles where role::text = 'owner') then
    insert into public.user_roles (user_id, role, granted_by)
    values (new.id, 'owner', new.id)
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

-- 7) verificação em duas etapas do painel (somente servidor)
CREATE TABLE IF NOT EXISTS public.admin_step_up (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_step_up TO service_role;
ALTER TABLE public.admin_step_up ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.admin_otp_attempts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_otp_attempts TO service_role;
ALTER TABLE public.admin_otp_attempts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_admin_step_up_updated_at BEFORE UPDATE ON public.admin_step_up
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admin_otp_attempts_updated_at BEFORE UPDATE ON public.admin_otp_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();