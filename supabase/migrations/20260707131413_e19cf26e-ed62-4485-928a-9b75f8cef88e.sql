
-- Track which contacts each user has already received
CREATE TABLE IF NOT EXISTS public.user_downloaded_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, contact_id)
);

GRANT SELECT, INSERT ON public.user_downloaded_contacts TO authenticated;
GRANT ALL ON public.user_downloaded_contacts TO service_role;

ALTER TABLE public.user_downloaded_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS udc_read ON public.user_downloaded_contacts;
CREATE POLICY udc_read ON public.user_downloaded_contacts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR contact_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS udc_insert ON public.user_downloaded_contacts;
CREATE POLICY udc_insert ON public.user_downloaded_contacts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS udc_user_idx ON public.user_downloaded_contacts(user_id);
CREATE INDEX IF NOT EXISTS udc_contact_idx ON public.user_downloaded_contacts(contact_id);

-- Track last successful login for inactivity sweep
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Record login: sets last_login_at, and if the user was auto-marked inactive (is_active=false while approved),
-- reactivates them. Suspended users are NOT reactivated by this function.
CREATE OR REPLACE FUNCTION public.record_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_login_at = now(),
      is_active = CASE WHEN status = 'approved'::public.user_status THEN true ELSE is_active END,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_login() TO authenticated;

-- Sweep: mark approved users inactive when they haven't logged in for 7 days.
-- Does NOT touch suspended/rejected/pending users.
CREATE OR REPLACE FUNCTION public.sweep_inactive_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.profiles
  SET is_active = false,
      updated_at = now()
  WHERE status = 'approved'::public.user_status
    AND is_active = true
    AND COALESCE(last_login_at, registration_date) < now() - INTERVAL '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sweep_inactive_users() TO authenticated, service_role;
