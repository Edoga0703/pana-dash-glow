
-- Permitir subida y lectura desde el frontend del CRM al bucket crm-media
CREATE POLICY "crm_media_anon_insert" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'crm-media');

CREATE POLICY "crm_media_anon_select" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'crm-media');
