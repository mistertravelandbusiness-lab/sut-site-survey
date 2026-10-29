-- Contrôle de l'accès SUT Survey ; appliquer avec un administrateur de la base.
BEGIN;
CREATE TABLE IF NOT EXISTS public.sut_app_control (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.sut_app_control(singleton,enabled) VALUES (true,true) ON CONFLICT(singleton) DO NOTHING;
ALTER TABLE public.sut_app_control ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sut_control_read ON public.sut_app_control;
CREATE POLICY sut_control_read ON public.sut_app_control FOR SELECT TO anon,authenticated USING (true);
GRANT SELECT ON public.sut_app_control TO anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.sut_app_control FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.sut_access_allowed() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce((SELECT enabled FROM public.sut_app_control WHERE singleton=true),false) OR public.is_admin()
$$;
REVOKE ALL ON FUNCTION public.sut_access_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sut_access_allowed() TO anon,authenticated;
DROP POLICY IF EXISTS sut_reports_access_gate ON public.rapports;
CREATE POLICY sut_reports_access_gate ON public.rapports AS RESTRICTIVE FOR ALL TO anon,authenticated USING (public.sut_access_allowed()) WITH CHECK (public.sut_access_allowed());
DROP POLICY IF EXISTS sut_users_access_gate ON public.users;
CREATE POLICY sut_users_access_gate ON public.users AS RESTRICTIVE FOR ALL TO anon,authenticated USING (public.sut_access_allowed()) WITH CHECK (public.sut_access_allowed());
DROP POLICY IF EXISTS users_own ON public.users;
DROP POLICY IF EXISTS sut_users_select ON public.users;
DROP POLICY IF EXISTS sut_users_insert ON public.users;
DROP POLICY IF EXISTS sut_users_update ON public.users;
DROP POLICY IF EXISTS sut_users_delete ON public.users;
CREATE POLICY sut_users_select ON public.users FOR SELECT TO authenticated USING (id=auth.uid() OR public.is_admin());
CREATE POLICY sut_users_insert ON public.users FOR INSERT TO authenticated WITH CHECK ((id=auth.uid() AND role='user') OR public.is_admin());
CREATE POLICY sut_users_update ON public.users FOR UPDATE TO authenticated USING (id=auth.uid() OR public.is_admin()) WITH CHECK ((id=auth.uid() AND role='user') OR public.is_admin());
CREATE POLICY sut_users_delete ON public.users FOR DELETE TO authenticated USING (public.is_admin());
CREATE OR REPLACE FUNCTION public.sut_set_access(p_enabled boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrateur requis' USING ERRCODE='42501'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'État requis'; END IF;
 UPDATE public.sut_app_control SET enabled=p_enabled,updated_at=now() WHERE singleton=true;
 IF NOT p_enabled THEN DELETE FROM auth.sessions s WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=s.user_id AND u.role='admin'); END IF;
 RETURN p_enabled;
END $$;
REVOKE ALL ON FUNCTION public.sut_set_access(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sut_set_access(boolean) TO authenticated;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sut_app_control') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.sut_app_control; END IF; END $$;
COMMIT;
