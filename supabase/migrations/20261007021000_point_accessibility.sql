create table public.point_accessibility (
 point_id uuid primary key references public.collection_points(id) on delete cascade,
 step_free_entrance text not null default 'unknown' check(step_free_entrance in ('yes','no','unknown')),
 wheelchair_access text not null default 'unknown' check(wheelchair_access in ('yes','no','unknown')),
 accessible_toilet text not null default 'unknown' check(accessible_toilet in ('yes','no','unknown')),
 libras_service text not null default 'unknown' check(libras_service in ('yes','no','unknown')),
 message_arrangement text not null default 'unknown' check(message_arrangement in ('yes','no','unknown')),
 confirmed_at timestamptz not null default now(),
 confirmed_by uuid references auth.users(id) on delete set null
);
alter table public.point_accessibility enable row level security;
revoke all on public.point_accessibility from anon,authenticated;
grant all on public.point_accessibility to service_role;
grant select(point_id,step_free_entrance,wheelchair_access,accessible_toilet,libras_service,message_arrangement,confirmed_at) on public.point_accessibility to anon,authenticated;
create policy point_accessibility_public on public.point_accessibility for select using(
 exists(select 1 from public.collection_points cp where cp.id=point_id and cp.state='SP' and cp.is_active and cp.curation_status='verified')
);
-- Writes and private reviewer reads are mediated by server-side admin authorization.
