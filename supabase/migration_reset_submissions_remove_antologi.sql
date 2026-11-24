-- ============================================================================
-- Migrasi Database Existing — e-SIPENA SMAN 1 Sidayu
-- 1. Mengosongkan seluruh data kurasi naskah pada tabel public.submissions
-- 2. Menghapus status 'Masuk Antologi' dari constraint, trigger, dan view publik
-- ============================================================================

TRUNCATE TABLE public.submissions;

DO $$
DECLARE
  v_con text;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.submissions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS %I', v_con);
  END LOOP;
END $$;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('Menunggu Kurasi', 'Perlu Revisi', 'Lolos Mading', 'Ditolak'));

CREATE OR REPLACE FUNCTION public.normalize_submission_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tracking_code IS NULL OR BTRIM(NEW.tracking_code) = '' THEN
    NEW.tracking_code := 'SPN-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6));
  ELSE
    NEW.tracking_code := UPPER(BTRIM(NEW.tracking_code));
  END IF;

  IF NEW.status = 'Lolos Mading' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE VIEW public.public_mading_works AS
SELECT
  id,
  tracking_code,
  title,
  author_name,
  author_role,
  author_class_unit,
  category,
  culture_theme,
  summary,
  body_text,
  gdrive_file_id,
  gdrive_view_url,
  gdrive_preview_url,
  status,
  is_placeholder,
  COALESCE(published_at, updated_at, created_at) AS published_at,
  created_at
FROM public.submissions
WHERE status = 'Lolos Mading';

NOTIFY pgrst, 'reload schema';
