CREATE POLICY "point_photos_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'point-photos');

CREATE POLICY "point_photos_authenticated_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'point-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "point_photos_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'point-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()))
WITH CHECK (bucket_id = 'point-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

CREATE POLICY "point_photos_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'point-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));