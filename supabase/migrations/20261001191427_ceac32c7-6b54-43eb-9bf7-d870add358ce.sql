drop policy if exists "Causas visíveis para todos" on public.causes;
create policy "Causas públicas válidas"
on public.causes
for select
to anon, authenticated
using (
  slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  and char_length(label) between 1 and 80
);

drop policy if exists "Anyone can submit a volunteer application" on public.volunteer_applications;
create policy "Inscrições públicas de voluntários válidas"
on public.volunteer_applications
for insert
to anon
with check (
  status = 'pending'
  and admin_notes is null
  and char_length(btrim(full_name)) between 2 and 120
  and char_length(email) between 3 and 255
  and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  and cardinality(areas) between 1 and 8
  and areas <@ array['verificacao-pontos','curadoria','divulgacao','suporte-usuarios','tech','design','traducao','outro']::text[]
  and char_length(coalesce(phone, '')) <= 40
  and char_length(coalesce(city, '')) <= 80
  and char_length(coalesce(state, '')) <= 10
  and char_length(coalesce(availability, '')) <= 500
  and char_length(coalesce(experience, '')) <= 1000
  and char_length(coalesce(motivation, '')) <= 1000
  and char_length(coalesce(heard_from, '')) <= 255
);

drop policy if exists "Leitura pública das configurações" on public.project_settings;
create policy "Leitura pública da apresentação"
on public.project_settings
for select
to anon, authenticated
using (key in ('owner_name', 'owner_bio', 'contact_email', 'contact_whatsapp'));

drop policy if exists "item_categories_select" on public.item_categories;
create policy "Categorias públicas válidas"
on public.item_categories
for select
to anon, authenticated
using (
  kind in ('item', 'service', 'financial')
  and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  and char_length(label) between 1 and 80
);

drop policy if exists "Causas dos pontos visíveis para todos" on public.point_causes;
create policy "Causas de pontos publicados"
on public.point_causes
for select
to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.collection_points cp
    where cp.id = point_causes.point_id
      and cp.is_active = true
      and cp.curation_status = 'verified'
  )
);

drop policy if exists "point_photos_published_read" on storage.objects;