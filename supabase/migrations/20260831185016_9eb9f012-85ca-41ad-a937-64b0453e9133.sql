create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'donor' check (role in ('donor','person_in_need','admin')),
  default_city text,
  default_lat double precision,
  default_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles (role);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_delete on public.profiles
  for delete using (public.is_admin());

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.item_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  kind text not null default 'item' check (kind in ('item','money','support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_item_categories_slug on public.item_categories (slug);

grant select on public.item_categories to anon;
grant select, insert, update, delete on public.item_categories to authenticated;
grant all on public.item_categories to service_role;

alter table public.item_categories enable row level security;

create policy item_categories_select on public.item_categories
  for select using (true);
create policy item_categories_insert on public.item_categories
  for insert with check (public.is_admin());
create policy item_categories_update on public.item_categories
  for update using (public.is_admin()) with check (public.is_admin());
create policy item_categories_delete on public.item_categories
  for delete using (public.is_admin());

create trigger trg_item_categories_updated_at
  before update on public.item_categories
  for each row execute function public.set_updated_at();

create table public.collection_points (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  address text,
  city text not null,
  state text,
  lat double precision not null,
  lng double precision not null,
  phone text,
  whatsapp text,
  opening_hours text,
  donation_method text,
  google_place_id text unique,
  source text not null default 'google_maps' check (source in ('google_maps','manual','self_claimed')),
  curation_status text not null default 'pending' check (curation_status in ('pending','verified','rejected')),
  is_active boolean not null default true,
  claimed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_collection_points_city on public.collection_points (city);
create index idx_collection_points_status on public.collection_points (curation_status);
create index idx_collection_points_active on public.collection_points (is_active);
create index idx_collection_points_geo on public.collection_points (lat, lng);
create index idx_collection_points_claimed_by on public.collection_points (claimed_by);

grant select on public.collection_points to anon;
grant select, insert, update, delete on public.collection_points to authenticated;
grant all on public.collection_points to service_role;

alter table public.collection_points enable row level security;

create policy collection_points_select on public.collection_points
  for select using (
    (is_active = true and curation_status = 'verified')
    or public.is_admin()
    or claimed_by = auth.uid()
  );
create policy collection_points_insert on public.collection_points
  for insert with check (public.is_admin());
create policy collection_points_update on public.collection_points
  for update using (public.is_admin() or claimed_by = auth.uid())
  with check (public.is_admin() or claimed_by = auth.uid());
create policy collection_points_delete on public.collection_points
  for delete using (public.is_admin());

create trigger trg_collection_points_updated_at
  before update on public.collection_points
  for each row execute function public.set_updated_at();

create table public.point_accepted_items (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.collection_points(id) on delete cascade,
  category_id uuid not null references public.item_categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (point_id, category_id)
);

create index idx_point_accepted_items_point on public.point_accepted_items (point_id);
create index idx_point_accepted_items_category on public.point_accepted_items (category_id);

grant select on public.point_accepted_items to anon;
grant select, insert, update, delete on public.point_accepted_items to authenticated;
grant all on public.point_accepted_items to service_role;

alter table public.point_accepted_items enable row level security;

create policy point_accepted_items_select on public.point_accepted_items
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.collection_points cp
      where cp.id = point_id and cp.is_active = true and cp.curation_status = 'verified'
    )
  );
create policy point_accepted_items_insert on public.point_accepted_items
  for insert with check (
    public.is_admin()
    or exists (select 1 from public.collection_points cp where cp.id = point_id and cp.claimed_by = auth.uid())
  );
create policy point_accepted_items_update on public.point_accepted_items
  for update using (
    public.is_admin()
    or exists (select 1 from public.collection_points cp where cp.id = point_id and cp.claimed_by = auth.uid())
  ) with check (
    public.is_admin()
    or exists (select 1 from public.collection_points cp where cp.id = point_id and cp.claimed_by = auth.uid())
  );
create policy point_accepted_items_delete on public.point_accepted_items
  for delete using (
    public.is_admin()
    or exists (select 1 from public.collection_points cp where cp.id = point_id and cp.claimed_by = auth.uid())
  );

create trigger trg_point_accepted_items_updated_at
  before update on public.point_accepted_items
  for each row execute function public.set_updated_at();

create table public.point_needs (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.collection_points(id) on delete cascade,
  category_id uuid not null references public.item_categories(id) on delete restrict,
  urgency text not null default 'normal' check (urgency in ('low','normal','high')),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_point_needs_point on public.point_needs (point_id);
create index idx_point_needs_category on public.point_needs (category_id);
create index idx_point_needs_active on public.point_needs (is_active);

grant select on public.point_needs to anon;
grant select, insert, update, delete on public.point_needs to authenticated;
grant all on public.point_needs to service_role;

alter table public.point_needs enable row level security;

create policy point_needs_select on public.point_needs
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.collection_points cp
      where cp.id = point_id and cp.is_active = true and cp.curation_status = 'verified'
    )
  );
create policy point_needs_insert on public.point_needs
  for insert with check (
    public.is_admin()
    or exists (select 1 from public.collection_points cp where cp.id = point_id and cp.claimed_by = auth.uid())
  );
create policy point_needs_update on public.point_needs
  for update using (
    public.is_admin()
    or exists (select 1 from public.collection_points cp where cp.id = point_id and cp.claimed_by = auth.uid())
  ) with check (
    public.is_admin()
    or exists (select 1 from public.collection_points cp where cp.id = point_id and cp.claimed_by = auth.uid())
  );
create policy point_needs_delete on public.point_needs
  for delete using (
    public.is_admin()
    or exists (select 1 from public.collection_points cp where cp.id = point_id and cp.claimed_by = auth.uid())
  );

create trigger trg_point_needs_updated_at
  before update on public.point_needs
  for each row execute function public.set_updated_at();

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete set null,
  category_id uuid not null references public.item_categories(id) on delete restrict,
  city text not null,
  lat double precision,
  lng double precision,
  note text,
  status text not null default 'open' check (status in ('open','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_help_requests_requester on public.help_requests (requester_id);
create index idx_help_requests_category on public.help_requests (category_id);
create index idx_help_requests_city on public.help_requests (city);
create index idx_help_requests_status on public.help_requests (status);

grant insert on public.help_requests to anon;
grant select, insert, update, delete on public.help_requests to authenticated;
grant all on public.help_requests to service_role;

alter table public.help_requests enable row level security;

create policy help_requests_select on public.help_requests
  for select using (requester_id = auth.uid() or public.is_admin());
create policy help_requests_insert on public.help_requests
  for insert with check (requester_id = auth.uid() or requester_id is null);
create policy help_requests_update on public.help_requests
  for update using (requester_id = auth.uid() or public.is_admin())
  with check (requester_id = auth.uid() or public.is_admin());
create policy help_requests_delete on public.help_requests
  for delete using (requester_id = auth.uid() or public.is_admin());

create trigger trg_help_requests_updated_at
  before update on public.help_requests
  for each row execute function public.set_updated_at();

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_token text,
  mode text not null default 'donor' check (mode in ('donor','person_in_need')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assistant_conversations_user on public.assistant_conversations (user_id);
create index idx_assistant_conversations_session on public.assistant_conversations (session_token);

grant insert on public.assistant_conversations to anon;
grant select, insert, update, delete on public.assistant_conversations to authenticated;
grant all on public.assistant_conversations to service_role;

alter table public.assistant_conversations enable row level security;

create policy assistant_conversations_select on public.assistant_conversations
  for select using (user_id = auth.uid() or public.is_admin());
create policy assistant_conversations_insert on public.assistant_conversations
  for insert with check (user_id = auth.uid() or user_id is null);
create policy assistant_conversations_update on public.assistant_conversations
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy assistant_conversations_delete on public.assistant_conversations
  for delete using (user_id = auth.uid() or public.is_admin());

create trigger trg_assistant_conversations_updated_at
  before update on public.assistant_conversations
  for each row execute function public.set_updated_at();

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  sender text not null check (sender in ('user','assistant')),
  content text not null,
  suggested_point_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assistant_messages_conversation on public.assistant_messages (conversation_id);

grant select, insert, update, delete on public.assistant_messages to authenticated;
grant all on public.assistant_messages to service_role;

alter table public.assistant_messages enable row level security;

create policy assistant_messages_select on public.assistant_messages
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.assistant_conversations ac
      where ac.id = conversation_id and ac.user_id = auth.uid()
    )
  );
create policy assistant_messages_insert on public.assistant_messages
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.assistant_conversations ac
      where ac.id = conversation_id and ac.user_id = auth.uid()
    )
  );
create policy assistant_messages_update on public.assistant_messages
  for update using (public.is_admin()) with check (public.is_admin());
create policy assistant_messages_delete on public.assistant_messages
  for delete using (public.is_admin());

create trigger trg_assistant_messages_updated_at
  before update on public.assistant_messages
  for each row execute function public.set_updated_at();

create table public.voluntary_donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.profiles(id) on delete set null,
  amount numeric(10,2),
  currency text not null default 'BRL',
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  provider text,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_voluntary_donations_donor on public.voluntary_donations (donor_id);
create index idx_voluntary_donations_status on public.voluntary_donations (status);

grant select on public.voluntary_donations to authenticated;
grant all on public.voluntary_donations to service_role;

alter table public.voluntary_donations enable row level security;

create policy voluntary_donations_select on public.voluntary_donations
  for select using (donor_id = auth.uid() or public.is_admin());
create policy voluntary_donations_insert on public.voluntary_donations
  for insert with check (public.is_admin());
create policy voluntary_donations_update on public.voluntary_donations
  for update using (public.is_admin()) with check (public.is_admin());
create policy voluntary_donations_delete on public.voluntary_donations
  for delete using (public.is_admin());

create trigger trg_voluntary_donations_updated_at
  before update on public.voluntary_donations
  for each row execute function public.set_updated_at();

create table public.point_import_logs (
  id uuid primary key default gen_random_uuid(),
  query_city text not null,
  points_found int not null default 0,
  points_created int not null default 0,
  run_by text not null default 'cron' check (run_by in ('cron','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_point_import_logs_city on public.point_import_logs (query_city);

grant select, insert, update, delete on public.point_import_logs to authenticated;
grant all on public.point_import_logs to service_role;

alter table public.point_import_logs enable row level security;

create policy point_import_logs_select on public.point_import_logs
  for select using (public.is_admin());
create policy point_import_logs_insert on public.point_import_logs
  for insert with check (public.is_admin());
create policy point_import_logs_update on public.point_import_logs
  for update using (public.is_admin()) with check (public.is_admin());
create policy point_import_logs_delete on public.point_import_logs
  for delete using (public.is_admin());

create trigger trg_point_import_logs_updated_at
  before update on public.point_import_logs
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'donor');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.item_categories (slug, label, kind) values
  ('dinheiro','Dinheiro','money'),
  ('roupas-adultas','Roupas adultas','item'),
  ('roupas-infantis','Roupas infantis','item'),
  ('alimentos','Alimentos','item'),
  ('apoio','Apoio e acolhimento','support')
on conflict (slug) do nothing;