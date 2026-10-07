begin;
create table public.point_territory (
 point_id uuid primary key references public.collection_points(id) on delete cascade,
 district text not null check(length(district) between 2 and 100),
 zone text not null check(zone in ('Sul','Norte','Leste','Oeste','Centro')),
 source text not null check(length(source) between 5 and 500),
 confirmed_at timestamptz not null default now(),
 confirmed_by uuid references auth.users(id) on delete set null
);
alter table public.point_territory enable row level security;
revoke all on public.point_territory from anon,authenticated;
grant all on public.point_territory to service_role;
grant select(point_id,district,zone,source,confirmed_at) on public.point_territory to anon,authenticated;
create policy point_territory_public on public.point_territory for select using (
 exists(select 1 from public.collection_points cp where cp.id=point_id and cp.city='São Paulo' and cp.state='SP' and cp.is_active and cp.curation_status='verified')
);
commit;
