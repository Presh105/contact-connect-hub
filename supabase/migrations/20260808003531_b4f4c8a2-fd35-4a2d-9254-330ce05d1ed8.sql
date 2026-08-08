DO $$ BEGIN
  CREATE TYPE public.membership_tier AS ENUM ('freemium','premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership public.membership_tier NOT NULL DEFAULT 'freemium';

CREATE OR REPLACE FUNCTION public.guard_profile_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change approval status';
    END IF;
  END IF;
  IF NEW.membership IS DISTINCT FROM OLD.membership THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change membership';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

ALTER TABLE public.user_downloaded_contacts
  ADD COLUMN IF NOT EXISTS import_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_confirmed_at timestamptz;

DROP POLICY IF EXISTS udc_self_update ON public.user_downloaded_contacts;
CREATE POLICY udc_self_update ON public.user_downloaded_contacts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT UPDATE ON public.user_downloaded_contacts TO authenticated;