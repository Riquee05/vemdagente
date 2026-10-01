alter table public.collection_points
  add column if not exists confirmation_status text not null default 'unconfirmed',
  add column if not exists confirmed_at timestamptz,
  add column if not exists donation_hours text,
  add column if not exists hidden_reason text;
alter table public.collection_points add constraint collection_points_confirmation_status_check
  check (confirmation_status in ('unconfirmed','confirmed','needs_update'));

alter table public.point_accepted_items add column if not exists confirmed_at timestamptz;

create or replace function public.guard_point_confirmation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.confirmation_status := 'unconfirmed'; new.confirmed_at := null; new.hidden_reason := null;
  elsif new.confirmation_status is distinct from old.confirmation_status
     or new.confirmed_at is distinct from old.confirmed_at
     or new.hidden_reason is distinct from old.hidden_reason then
    raise exception 'Somente a administração pode alterar a confirmação do local.';
  end if;
  return new;
end; $$;
create trigger trg_collection_points_guard_confirmation
  before insert or update on public.collection_points
  for each row execute function public.guard_point_confirmation();

create or replace function public.guard_item_confirmation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then new.confirmed_at := null;
  elsif new.confirmed_at is distinct from old.confirmed_at then
    raise exception 'Somente a administração pode confirmar itens aceitos.';
  end if;
  return new;
end; $$;
create trigger trg_point_items_guard_confirmation
  before insert or update on public.point_accepted_items
  for each row execute function public.guard_item_confirmation();
revoke execute on function public.guard_point_confirmation() from public, anon, authenticated;
revoke execute on function public.guard_item_confirmation() from public, anon, authenticated;

create table public.point_corrections (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.collection_points(id) on delete cascade,
  message text not null check (char_length(message) between 5 and 2000),
  contact text check (contact is null or char_length(contact) <= 200),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  submitted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant insert on public.point_corrections to anon, authenticated;
grant select, update, delete on public.point_corrections to authenticated;
grant all on public.point_corrections to service_role;
alter table public.point_corrections enable row level security;
create policy "Qualquer pessoa envia correção" on public.point_corrections for insert to anon, authenticated
  with check (status = 'open');
create policy "Admins leem correções" on public.point_corrections for select to authenticated using (public.is_admin());
create policy "Admins atualizam correções" on public.point_corrections for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins removem correções" on public.point_corrections for delete to authenticated using (public.is_admin());
create trigger trg_point_corrections_updated_at before update on public.point_corrections
  for each row execute function public.set_updated_at();

create table public.project_settings (
  key text primary key,
  value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.project_settings to anon, authenticated;
grant insert, update, delete on public.project_settings to authenticated;
grant all on public.project_settings to service_role;
alter table public.project_settings enable row level security;
create policy "Leitura pública das configurações" on public.project_settings for select to anon, authenticated using (true);
create policy "Admins editam configurações" on public.project_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger trg_project_settings_updated_at before update on public.project_settings
  for each row execute function public.set_updated_at();
insert into public.project_settings(key, value) values
  ('owner_name',''),('owner_bio',''),('contact_email',''),('contact_whatsapp','')
on conflict do nothing;