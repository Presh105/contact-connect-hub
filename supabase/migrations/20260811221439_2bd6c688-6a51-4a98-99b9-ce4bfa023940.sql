CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_read_all" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_app_settings_touch BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.app_settings (key, value) VALUES ('tutorial_video_url', '')
  ON CONFLICT (key) DO NOTHING;

-- Stop auto-deactivating members: everyone approved stays visible
CREATE OR REPLACE FUNCTION public.sweep_inactive_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 0;
END;
$$;