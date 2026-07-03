
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Sequence for SC codes
CREATE SEQUENCE public.sc_code_seq START 1;

-- Contact versions
CREATE TABLE public.contact_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number int NOT NULL UNIQUE,
  contact_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text
);
CREATE INDEX idx_versions_number ON public.contact_versions(version_number);
GRANT SELECT ON public.contact_versions TO authenticated;
GRANT ALL ON public.contact_versions TO service_role;
ALTER TABLE public.contact_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions_read_all" ON public.contact_versions FOR SELECT TO authenticated USING (true);

-- Profiles (each profile is also a contact)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_code text NOT NULL UNIQUE,
  contact_seq int NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  country text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  version_id uuid REFERENCES public.contact_versions(id) ON DELETE SET NULL,
  last_download_version_number int NOT NULL DEFAULT 0,
  last_download_date timestamptz,
  total_contacts_received int NOT NULL DEFAULT 0,
  registration_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_user_code ON public.profiles(user_code);
CREATE INDEX idx_profiles_active ON public.profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_profiles_version ON public.profiles(version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Downloads log
CREATE TABLE public.downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  download_type text NOT NULL CHECK (download_type IN ('new','complete')),
  from_version int NOT NULL DEFAULT 0,
  to_version int NOT NULL DEFAULT 0,
  contact_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_downloads_user ON public.downloads(user_id);
CREATE INDEX idx_downloads_created ON public.downloads(created_at DESC);
GRANT SELECT, INSERT ON public.downloads TO authenticated;
GRANT ALL ON public.downloads TO service_role;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "downloads_self_read" ON public.downloads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "downloads_self_insert" ON public.downloads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_self_read" ON public.audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "audit_self_insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seq int;
  v_code text;
BEGIN
  v_seq := nextval('public.sc_code_seq');
  v_code := 'SC ' || lpad(v_seq::text, 6, '0');

  INSERT INTO public.profiles (id, user_code, contact_seq, full_name, phone, email, country)
  VALUES (
    NEW.id,
    v_code,
    v_seq,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'email_contact', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', '')
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper: lookup auth email from phone (for phone-based login)
CREATE OR REPLACE FUNCTION public.email_for_phone(_phone text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT u.email FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.phone = _phone
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.email_for_phone(text) TO anon, authenticated;

-- Check if phone exists
CREATE OR REPLACE FUNCTION public.phone_exists(_phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE phone = _phone);
$$;
GRANT EXECUTE ON FUNCTION public.phone_exists(text) TO anon, authenticated;

-- Publish new version: gathers all unversioned active profiles into new version
CREATE OR REPLACE FUNCTION public.publish_new_version()
RETURNS public.contact_versions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_next int;
  v_row public.contact_versions;
  v_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can publish versions';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next FROM public.contact_versions;

  INSERT INTO public.contact_versions (version_number, created_by)
  VALUES (v_next, auth.uid())
  RETURNING * INTO v_row;

  UPDATE public.profiles
  SET version_id = v_row.id
  WHERE version_id IS NULL AND is_active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.contact_versions SET contact_count = v_count WHERE id = v_row.id;

  -- If no new contacts, remove the empty version
  IF v_count = 0 THEN
    DELETE FROM public.contact_versions WHERE id = v_row.id;
    RAISE EXCEPTION 'No new contacts to publish';
  END IF;

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.publish_new_version() TO authenticated;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
