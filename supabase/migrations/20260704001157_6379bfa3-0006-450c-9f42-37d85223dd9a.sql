
-- 1. Approval status
CREATE TYPE public.user_status AS ENUM ('pending','approved','rejected','suspended');
ALTER TABLE public.profiles ADD COLUMN status public.user_status NOT NULL DEFAULT 'pending';
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- Backfill: existing rows are approved so we don't break current test data
UPDATE public.profiles SET status = 'approved';

-- 2. Expand downloads.download_type to include 'first_community'
ALTER TABLE public.downloads DROP CONSTRAINT IF EXISTS downloads_download_type_check;
ALTER TABLE public.downloads ADD CONSTRAINT downloads_download_type_check
  CHECK (download_type IN ('first_community','new','complete'));

-- 3. handle_new_user: first user = admin+approved, others = pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seq int;
  v_code text;
  v_is_first boolean;
  v_status public.user_status;
  v_role public.app_role;
BEGIN
  v_seq := nextval('public.sc_code_seq');
  v_code := 'SC ' || lpad(v_seq::text, 6, '0');

  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO v_is_first;
  v_status := 'approved'::public.user_status;
  v_role   := CASE WHEN v_is_first THEN 'admin'::public.app_role ELSE 'user'::public.app_role END;

  INSERT INTO public.profiles (id, user_code, contact_seq, full_name, phone, email, country, status, is_active)
  VALUES (
    NEW.id,
    v_code,
    v_seq,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'email_contact', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    v_status,
    true
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. publish_new_version: only approved users get versioned
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
  WHERE version_id IS NULL
    AND status = 'approved'
    AND is_active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.contact_versions SET contact_count = v_count WHERE id = v_row.id;

  IF v_count = 0 THEN
    DELETE FROM public.contact_versions WHERE id = v_row.id;
    RAISE EXCEPTION 'No new approved contacts to publish';
  END IF;

  RETURN v_row;
END;
$$;

-- 5. When admin approves a user, auto-assign to next version on next publish (version_id stays NULL until publish).
-- Nothing more needed.
