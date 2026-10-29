-- Les photos sont modifiables uniquement par leur propriétaire ou un administrateur.
-- La lecture publique n'est pas modifiée par cette migration.
BEGIN;
DROP POLICY IF EXISTS rapports_auth_insert ON storage.objects;
DROP POLICY IF EXISTS rapports_auth_update ON storage.objects;
DROP POLICY IF EXISTS rapports_auth_delete ON storage.objects;
CREATE POLICY rapports_auth_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='rapports' AND public.sut_access_allowed() AND (split_part(name,'/',1)=auth.uid()::text OR public.is_admin()));
CREATE POLICY rapports_auth_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='rapports' AND public.sut_access_allowed() AND (split_part(name,'/',1)=auth.uid()::text OR public.is_admin())) WITH CHECK (bucket_id='rapports' AND public.sut_access_allowed() AND (split_part(name,'/',1)=auth.uid()::text OR public.is_admin()));
CREATE POLICY rapports_auth_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='rapports' AND public.sut_access_allowed() AND (split_part(name,'/',1)=auth.uid()::text OR public.is_admin()));
COMMIT;
