-- Corrige la suppression réelle d'un compte (et les rapports liés par la base).
CREATE OR REPLACE FUNCTION public.delete_user(p_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 IF p_id=auth.uid() THEN RAISE EXCEPTION 'Impossible de supprimer votre propre compte'; END IF;
 IF EXISTS(SELECT 1 FROM public.users WHERE id=p_id AND role='admin') THEN RAISE EXCEPTION 'Impossible de supprimer un compte administrateur'; END IF;
 DELETE FROM auth.users WHERE id=p_id;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;
