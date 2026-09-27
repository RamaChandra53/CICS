-- Roll numbers are login identifiers, while profiles remain the academic source of truth.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admission_type TEXT NOT NULL DEFAULT 'regular' CHECK (admission_type IN ('regular', 'lateral'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS joining_year INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_section_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_section_check CHECK (section IS NULL OR section <> '');
CREATE UNIQUE INDEX IF NOT EXISTS profiles_roll_number_normalized_unique ON public.profiles (upper(btrim(roll_number))) WHERE roll_number IS NOT NULL;
CREATE OR REPLACE FUNCTION public.prevent_roll_number_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.roll_number IS DISTINCT FROM OLD.roll_number AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'roll_number is immutable';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS profiles_roll_number_immutable ON public.profiles;
CREATE TRIGGER profiles_roll_number_immutable BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_roll_number_change();
COMMENT ON COLUMN public.profiles.section IS 'Authoritative academic section; nullable until college allocation is available.';
