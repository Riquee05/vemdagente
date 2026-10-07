begin;
create table public.point_delivery (
 point_id uuid primary key references public.collection_points(id) on delete cascade,
 drop_off text not null default 'unknown' check(drop_off in ('yes','no','unknown')),
 pickup text not null default 'unknown' check(pickup in ('yes','no','unknown')),
 appointment text not null default 'unknown' check(appointment in ('yes','no','unknown')),
 confirmed_at timestamptz not null default now(),
 confirmed_by uuid references auth.users(id) on delete set null
);
alter table public.point_delivery enable row level security;
revoke all on public.point_delivery from anon,authenticated;
grant all on public.point_delivery to service_role;
grant select(point_id,drop_off,pickup,appointment,confirmed_at) on public.point_delivery to anon,authenticated;
create policy point_delivery_public on public.point_delivery for select using (
 exists(select 1 from public.collection_points cp where cp.id=point_id and cp.state='SP' and cp.is_active and cp.curation_status='verified')
);
create table public.point_change_history (
 id uuid primary key default gen_random_uuid(),
 point_id uuid not null references public.collection_points(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now(),
 changes jsonb not null
);
create index point_change_history_recent on public.point_change_history(point_id,changed_at desc);
alter table public.point_change_history enable row level security;
revoke all on public.point_change_history from anon,authenticated;
grant select on public.point_change_history to service_role;
-- Trigger inserts only; no API can rewrite the audit trail.
create function public.record_point_changes() returns trigger language plpgsql security definer set search_path = pg_catalog,public as $$
declare fields text[]; field text; changes jsonb := '{}'::jsonb; before_row jsonb; after_row jsonb;
begin
 if TG_TABLE_NAME='collection_points' then
  fields:=array['name','description','address','city','state','phone','whatsapp','website','opening_hours','donation_hours','donation_method','curation_status','confirmation_status','confirmed_at','is_active'];
 else fields:=array['drop_off','pickup','appointment','confirmed_at']; end if;
 before_row:=case when TG_OP='INSERT' then '{}'::jsonb else to_jsonb(OLD) end;
 after_row:=to_jsonb(NEW);
 foreach field in array fields loop
  if before_row->field is distinct from after_row->field then
   changes:=changes || jsonb_build_object(case when TG_TABLE_NAME='point_delivery' then 'delivery.' else '' end || field,jsonb_build_object('before',before_row->field,'after',after_row->field));
  end if;
 end loop;
 if changes <> '{}'::jsonb then
  insert into public.point_change_history(point_id,actor_id,changes) values (
   case when TG_TABLE_NAME='collection_points' then (after_row->>'id')::uuid else (after_row->>'point_id')::uuid end,
   case when TG_TABLE_NAME='point_delivery' then (after_row->>'confirmed_by')::uuid else auth.uid() end,changes);
 end if;
 return NEW;
end;
$$;
revoke all on function public.record_point_changes() from public,anon,authenticated;
create trigger collection_points_history after update on public.collection_points for each row execute function public.record_point_changes();
create trigger point_delivery_history after insert or update on public.point_delivery for each row execute function public.record_point_changes();
commit;
