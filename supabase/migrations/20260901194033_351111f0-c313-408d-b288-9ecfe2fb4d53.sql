drop policy if exists "point_photos_public_read" on storage.objects;

-- Fotos de pontos publicados (verificados e ativos) seguem legíveis publicamente.
create policy "point_photos_published_read"
on storage.objects
for select
to public
using (
  bucket_id = 'point-photos'
  and exists (
    select 1
    from public.collection_points cp
    where cp.photo_url = storage.objects.name
      and cp.is_active
      and cp.curation_status = 'verified'
  )
);

-- Dono do arquivo (ou admin) pode ler os próprios envios ainda não publicados.
create policy "point_photos_owner_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'point-photos'
  and (
    (storage.foldername(name))[1] = (auth.uid())::text
    or public.is_admin()
  )
);