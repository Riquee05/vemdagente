-- 1) Audit trail: only admins can write, and only in their own name
drop policy if exists admin_audit_log_insert on public.admin_audit_log;
create policy admin_audit_log_insert on public.admin_audit_log
for insert to authenticated
with check (actor_id = auth.uid() and public.is_admin());

-- 2) search_nearby_points relies on RLS instead of bypassing it
create or replace function public.search_nearby_points(
  p_lat double precision,
  p_lng double precision,
  p_category_id uuid default null,
  p_radius_km double precision default 15,
  p_limit integer default 50
)
returns table (
  id uuid, name text, description text, address text, city text, state text,
  lat double precision, lng double precision, phone text, whatsapp text,
  website text, photo_url text, opening_hours text, donation_method text,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select cp.id, cp.name, cp.description, cp.address, cp.city, cp.state,
    cp.lat, cp.lng, cp.phone, cp.whatsapp, cp.website, cp.photo_url,
    cp.opening_hours, cp.donation_method,
    (6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(p_lat)) * cos(radians(cp.lat)) * cos(radians(cp.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(cp.lat)))))) as distance_km
  from public.collection_points cp
  where cp.is_active = true
    and cp.curation_status = 'verified'
    and (p_category_id is null or exists (
      select 1 from public.point_accepted_items pai
      where pai.point_id = cp.id and pai.category_id = p_category_id))
    and (6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(p_lat)) * cos(radians(cp.lat)) * cos(radians(cp.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(cp.lat))))))
      <= greatest(0.1, coalesce(p_radius_km, 15))
  order by distance_km asc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- 3) Public (anon) access no longer touches admin role-check helpers
drop policy if exists collection_points_select on public.collection_points;
create policy collection_points_public_select on public.collection_points
for select to anon
using (is_active = true and curation_status = 'verified');
create policy collection_points_select on public.collection_points
for select to authenticated
using (
  (is_active = true and curation_status = 'verified')
  or public.is_admin() or claimed_by = auth.uid() or submitted_by = auth.uid()
);

drop policy if exists collection_points_update on public.collection_points;
create policy collection_points_update on public.collection_points
for update to authenticated
using (public.is_admin() or claimed_by = auth.uid() or (submitted_by = auth.uid() and curation_status = 'pending'))
with check (public.is_admin() or claimed_by = auth.uid() or (submitted_by = auth.uid() and curation_status = 'pending'));

drop policy if exists collection_points_delete on public.collection_points;
create policy collection_points_delete on public.collection_points
for delete to authenticated using (public.is_admin());

-- point_accepted_items
drop policy if exists point_accepted_items_select on public.point_accepted_items;
create policy point_accepted_items_public_select on public.point_accepted_items
for select to anon
using (exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.is_active = true and cp.curation_status = 'verified'));
create policy point_accepted_items_select on public.point_accepted_items
for select to authenticated
using (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.is_active = true and cp.curation_status = 'verified'));

drop policy if exists point_accepted_items_insert on public.point_accepted_items;
create policy point_accepted_items_insert on public.point_accepted_items
for insert to authenticated
with check (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.claimed_by = auth.uid()));

drop policy if exists point_accepted_items_update on public.point_accepted_items;
create policy point_accepted_items_update on public.point_accepted_items
for update to authenticated
using (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.claimed_by = auth.uid()))
with check (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.claimed_by = auth.uid()));

drop policy if exists point_accepted_items_delete on public.point_accepted_items;
create policy point_accepted_items_delete on public.point_accepted_items
for delete to authenticated
using (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.claimed_by = auth.uid()));

-- point_needs
drop policy if exists point_needs_select on public.point_needs;
create policy point_needs_public_select on public.point_needs
for select to anon
using (exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.is_active = true and cp.curation_status = 'verified'));
create policy point_needs_select on public.point_needs
for select to authenticated
using (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.is_active = true and cp.curation_status = 'verified'));

drop policy if exists point_needs_insert on public.point_needs;
create policy point_needs_insert on public.point_needs
for insert to authenticated
with check (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.claimed_by = auth.uid()));

drop policy if exists point_needs_update on public.point_needs;
create policy point_needs_update on public.point_needs
for update to authenticated
using (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.claimed_by = auth.uid()))
with check (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.claimed_by = auth.uid()));

drop policy if exists point_needs_delete on public.point_needs;
create policy point_needs_delete on public.point_needs
for delete to authenticated
using (public.is_admin() or exists (select 1 from public.collection_points cp
  where cp.id = point_id and cp.claimed_by = auth.uid()));

-- item_categories (writes are admin-only)
drop policy if exists item_categories_insert on public.item_categories;
create policy item_categories_insert on public.item_categories
for insert to authenticated with check (public.is_admin());
drop policy if exists item_categories_update on public.item_categories;
create policy item_categories_update on public.item_categories
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists item_categories_delete on public.item_categories;
create policy item_categories_delete on public.item_categories
for delete to authenticated using (public.is_admin());

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
for delete to authenticated using (public.is_admin());

-- help_requests
drop policy if exists help_requests_select on public.help_requests;
create policy help_requests_select on public.help_requests
for select to authenticated using (requester_id = auth.uid() or public.is_admin());
drop policy if exists help_requests_update on public.help_requests;
create policy help_requests_update on public.help_requests
for update to authenticated using (requester_id = auth.uid() or public.is_admin())
with check (requester_id = auth.uid() or public.is_admin());
drop policy if exists help_requests_delete on public.help_requests;
create policy help_requests_delete on public.help_requests
for delete to authenticated using (requester_id = auth.uid() or public.is_admin());

-- assistant_conversations
drop policy if exists assistant_conversations_select on public.assistant_conversations;
create policy assistant_conversations_select on public.assistant_conversations
for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists assistant_conversations_update on public.assistant_conversations;
create policy assistant_conversations_update on public.assistant_conversations
for update to authenticated using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
drop policy if exists assistant_conversations_delete on public.assistant_conversations;
create policy assistant_conversations_delete on public.assistant_conversations
for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- assistant_messages
drop policy if exists assistant_messages_select on public.assistant_messages;
create policy assistant_messages_select on public.assistant_messages
for select to authenticated
using (public.is_admin() or exists (select 1 from public.assistant_conversations ac
  where ac.id = conversation_id and ac.user_id = auth.uid()));
drop policy if exists assistant_messages_insert on public.assistant_messages;
create policy assistant_messages_insert on public.assistant_messages
for insert to authenticated
with check (public.is_admin() or exists (select 1 from public.assistant_conversations ac
  where ac.id = conversation_id and ac.user_id = auth.uid()));
drop policy if exists assistant_messages_update on public.assistant_messages;
create policy assistant_messages_update on public.assistant_messages
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists assistant_messages_delete on public.assistant_messages;
create policy assistant_messages_delete on public.assistant_messages
for delete to authenticated using (public.is_admin());

-- point_import_logs (admin-only)
drop policy if exists point_import_logs_select on public.point_import_logs;
create policy point_import_logs_select on public.point_import_logs
for select to authenticated using (public.is_admin());
drop policy if exists point_import_logs_insert on public.point_import_logs;
create policy point_import_logs_insert on public.point_import_logs
for insert to authenticated with check (public.is_admin());
drop policy if exists point_import_logs_update on public.point_import_logs;
create policy point_import_logs_update on public.point_import_logs
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists point_import_logs_delete on public.point_import_logs;
create policy point_import_logs_delete on public.point_import_logs
for delete to authenticated using (public.is_admin());

-- voluntary_donations
drop policy if exists voluntary_donations_select on public.voluntary_donations;
create policy voluntary_donations_select on public.voluntary_donations
for select to authenticated using (donor_id = auth.uid() or public.is_admin());
drop policy if exists voluntary_donations_insert on public.voluntary_donations;
create policy voluntary_donations_insert on public.voluntary_donations
for insert to authenticated with check (public.is_admin());
drop policy if exists voluntary_donations_update on public.voluntary_donations;
create policy voluntary_donations_update on public.voluntary_donations
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists voluntary_donations_delete on public.voluntary_donations;
create policy voluntary_donations_delete on public.voluntary_donations
for delete to authenticated using (public.is_admin());

-- 4) No anonymous access to the privileged role-check helpers
revoke execute on function public.is_admin() from anon;
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.is_owner(uuid) from anon;