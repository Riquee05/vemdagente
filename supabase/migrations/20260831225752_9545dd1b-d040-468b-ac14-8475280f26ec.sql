-- 1. Papéis de acesso em tabela separada (evita escalonamento de privilégio)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists user_roles_insert on public.user_roles;
create policy user_roles_insert on public.user_roles
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists user_roles_update on public.user_roles;
create policy user_roles_update on public.user_roles
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists user_roles_delete on public.user_roles;
create policy user_roles_delete on public.user_roles
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists trg_user_roles_updated_at on public.user_roles;
create trigger trg_user_roles_updated_at before update on public.user_roles
  for each row execute function public.set_updated_at();

-- 2. Migra administradores atuais
insert into public.user_roles (user_id, role)
select p.id, 'admin'::public.app_role
from public.profiles p
where p.role = 'admin'
on conflict (user_id, role) do nothing;

-- 3. is_admin passa a ler apenas user_roles
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- 4. Impede gravar 'admin' em profiles.role
update public.profiles set role = 'donor' where role = 'admin';

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role not in ('donor', 'person_in_need') then
    raise exception 'Papel inválido no perfil. Acesso administrativo é gerenciado separadamente.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_no_role_escalation on public.profiles;
create trigger trg_profiles_no_role_escalation
  before insert or update of role on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

-- 5. Primeiro administrador (só se ainda não existir nenhum)
create or replace function public.claim_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return false;
  end if;
  insert into public.user_roles (user_id, role, granted_by)
  values (auth.uid(), 'admin', auth.uid())
  on conflict (user_id, role) do nothing;
  return true;
end;
$$;

-- 6. Trilha de auditoria (LGPD)
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

grant select on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists admin_audit_log_insert on public.admin_audit_log;
create policy admin_audit_log_insert on public.admin_audit_log
  for insert to authenticated
  with check (actor_id = auth.uid());

-- 7. Dados pessoais: candidaturas só pelo titular/admin, sem leitura anônima
revoke select on public.volunteer_applications from anon;
revoke select on public.help_requests from anon;
