-- ============================================================================
-- Skema Database Supabase — Portal Literasi Digital e-SIPENA SMAN 1 Sidayu
-- Terdiri dari: 4 tabel utama, 1 view publik, RLS ketat, dan 2 RPC publik
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Fungsi utilitas trigger updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. Tabel books (Katalog Buku & 12 Novel 2026)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL CHECK (
    author_role IN ('Siswa XI', 'Siswa XII', 'Guru', 'Tendik', 'Kepala Sekolah')
  ),
  author_class text NOT NULL DEFAULT '',
  publication_year integer NOT NULL DEFAULT 2026,
  category text NOT NULL DEFAULT 'Novel',
  synopsis text NOT NULL,
  cover_url text NOT NULL,
  gdrive_file_id text NOT NULL DEFAULT '',
  gdrive_preview_url text NOT NULL DEFAULT '',
  qrcbn_code text NOT NULL DEFAULT '',
  likes_count integer NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_placeholder boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_published_sort
  ON public.books (is_published, sort_order, title);

CREATE INDEX IF NOT EXISTS idx_books_author_role
  ON public.books (author_role);

DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Tabel submissions (Naskah Masuk & Karya Mading Digital)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code text UNIQUE NOT NULL DEFAULT (
    'SPN-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  title text NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL CHECK (
    author_role IN ('Siswa X', 'Siswa XI', 'Siswa XII', 'Guru', 'Tendik')
  ),
  author_class_unit text NOT NULL,
  category text NOT NULL CHECK (
    category IN ('Cerpen', 'Esai Budaya', 'Puisi', 'Resensi Buku', 'Artikel Literasi', 'Novel')
  ),
  culture_theme text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  gdrive_file_id text NOT NULL DEFAULT '',
  gdrive_view_url text NOT NULL DEFAULT '',
  gdrive_preview_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_size_bytes integer NOT NULL DEFAULT 0 CHECK (
    file_size_bytes >= 0 AND file_size_bytes <= 3145728
  ),
  contact_wa text NOT NULL DEFAULT '',
  anti_plagiarism_agreed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Menunggu Kurasi' CHECK (
    status IN ('Menunggu Kurasi', 'Perlu Revisi', 'Lolos Mading', 'Ditolak')
  ),
  reviewer_notes text NOT NULL DEFAULT '',
  is_placeholder boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_tracking_code
  ON public.submissions (tracking_code);

CREATE INDEX IF NOT EXISTS idx_submissions_status_created
  ON public.submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_author_role
  ON public.submissions (author_role);

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

DROP TRIGGER IF EXISTS trg_submissions_normalize ON public.submissions;
CREATE TRIGGER trg_submissions_normalize
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_submission_fields();

DROP TRIGGER IF EXISTS trg_submissions_updated_at ON public.submissions;
CREATE TRIGGER trg_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Tabel models_3d (Koleksi Pameran 3D & AR Budaya Gresik)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.models_3d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  introduction text NOT NULL,
  category text NOT NULL DEFAULT 'Budaya Gresik',
  model_path text NOT NULL,
  placeholder_url text NOT NULL DEFAULT '',
  audio_path text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_models_3d_active_sort
  ON public.models_3d (is_active, sort_order);

DROP TRIGGER IF EXISTS trg_models_3d_updated_at ON public.models_3d;
CREATE TRIGGER trg_models_3d_updated_at
  BEFORE UPDATE ON public.models_3d
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Tabel site_settings (Profil Sekolah, KPI, Kontak WA, Sudut Pustakawan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT true,
  is_placeholder boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- View Publik: public_mading_works
-- Hanya status 'Lolos Mading', TANPA kolom contact_wa
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) & Hak Akses Ketat
-- ----------------------------------------------------------------------------
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models_3d ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.books FROM anon;
REVOKE ALL ON public.submissions FROM anon;
REVOKE ALL ON public.models_3d FROM anon;
REVOKE ALL ON public.site_settings FROM anon;
REVOKE ALL ON public.public_mading_works FROM anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.books TO anon;
GRANT SELECT ON public.public_mading_works TO anon;
GRANT SELECT ON public.models_3d TO anon;
GRANT SELECT ON public.site_settings TO anon;
GRANT INSERT ON public.submissions TO anon;

GRANT ALL ON public.books, public.submissions, public.models_3d, public.site_settings TO authenticated;
GRANT SELECT ON public.public_mading_works TO authenticated;

-- Policy tabel books
DROP POLICY IF EXISTS books_anon_select_published ON public.books;
CREATE POLICY books_anon_select_published
  ON public.books
  FOR SELECT
  TO anon
  USING (is_published = true);

DROP POLICY IF EXISTS books_authenticated_all ON public.books;
CREATE POLICY books_authenticated_all
  ON public.books
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy tabel submissions
-- Catatan: anon HANYA boleh INSERT dengan persetujuan anti-plagiat dan status awal
DROP POLICY IF EXISTS submissions_anon_insert_public ON public.submissions;
CREATE POLICY submissions_anon_insert_public
  ON public.submissions
  FOR INSERT
  TO anon
  WITH CHECK (
    anti_plagiarism_agreed = true
    AND status = 'Menunggu Kurasi'
    AND is_placeholder = false
  );

DROP POLICY IF EXISTS submissions_authenticated_all ON public.submissions;
CREATE POLICY submissions_authenticated_all
  ON public.submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy tabel models_3d
DROP POLICY IF EXISTS models_3d_anon_select_active ON public.models_3d;
CREATE POLICY models_3d_anon_select_active
  ON public.models_3d
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS models_3d_authenticated_all ON public.models_3d;
CREATE POLICY models_3d_authenticated_all
  ON public.models_3d
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy tabel site_settings
DROP POLICY IF EXISTS site_settings_anon_select_public ON public.site_settings;
CREATE POLICY site_settings_anon_select_public
  ON public.site_settings
  FOR SELECT
  TO anon
  USING (is_public = true);

DROP POLICY IF EXISTS site_settings_authenticated_all ON public.site_settings;
CREATE POLICY site_settings_authenticated_all
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- RPC 1: track_submission(p_tracking_code text)
-- Cek status naskah tanpa login dan tanpa membocorkan kolom contact_wa
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_submission(p_tracking_code text)
RETURNS TABLE (
  id uuid,
  tracking_code text,
  title text,
  author_name text,
  author_role text,
  author_class_unit text,
  category text,
  culture_theme text,
  status text,
  reviewer_notes text,
  gdrive_preview_url text,
  gdrive_view_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  v_code := UPPER(BTRIM(COALESCE(p_tracking_code, '')));
  IF v_code = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.tracking_code,
    s.title,
    s.author_name,
    s.author_role,
    s.author_class_unit,
    s.category,
    s.culture_theme,
    s.status,
    s.reviewer_notes,
    s.gdrive_preview_url,
    s.gdrive_view_url,
    s.created_at,
    s.updated_at
  FROM public.submissions AS s
  WHERE UPPER(s.tracking_code) = v_code
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.track_submission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_submission(text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- RPC 2: increment_book_like(p_book_id uuid)
-- Menambah apresiasi/suka buku secara atomik oleh pengunjung publik
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_book_like(p_book_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_likes integer;
BEGIN
  UPDATE public.books
  SET likes_count = likes_count + 1
  WHERE id = p_book_id
    AND is_published = true
  RETURNING likes_count INTO v_likes;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buku tidak ditemukan atau belum dipublikasikan.';
  END IF;

  RETURN v_likes;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_book_like(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_book_like(uuid) TO anon, authenticated;
