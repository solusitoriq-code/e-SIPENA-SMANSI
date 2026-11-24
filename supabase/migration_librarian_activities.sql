-- ============================================================================
-- Migrasi: Mengganti Dokumen Sudut Pustakawan menjadi Kegiatan (librarian_activities)
-- Jalankan skrip ini di SQL Editor Supabase jika database sebelumnya sudah dibuat.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.librarian_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_librarian_activities_active_sort
  ON public.librarian_activities (is_active, sort_order, created_at DESC);

DROP TRIGGER IF EXISTS trg_librarian_activities_updated_at ON public.librarian_activities;
CREATE TRIGGER trg_librarian_activities_updated_at
  BEFORE UPDATE ON public.librarian_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.librarian_activities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.librarian_activities FROM anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.librarian_activities TO anon;
GRANT ALL ON public.librarian_activities TO authenticated;

DROP POLICY IF EXISTS librarian_activities_anon_select_active ON public.librarian_activities;
CREATE POLICY librarian_activities_anon_select_active
  ON public.librarian_activities
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS librarian_activities_authenticated_all ON public.librarian_activities;
CREATE POLICY librarian_activities_authenticated_all
  ON public.librarian_activities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

UPDATE public.site_settings
SET
  description = 'Jadwal layanan perpustakaan di menu Sudut Pustakawan',
  value = jsonb_set(
    COALESCE(value, '{}'::jsonb) - 'documents',
    '{headline}',
    '"Sudut Pustakawan & Kegiatan Literasi"'::jsonb,
    true
  )
WHERE key = 'librarian_corner';
