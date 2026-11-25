-- ============================================================================
-- Migrasi: Menambah menu Cerita Gresik (Daftar Video: Judul, Deskripsi, URL)
-- Jalankan skrip ini di SQL Editor Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cerita_gresik_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cerita_gresik_videos_active_sort
  ON public.cerita_gresik_videos (is_active, sort_order, created_at DESC);

DROP TRIGGER IF EXISTS trg_cerita_gresik_videos_updated_at ON public.cerita_gresik_videos;
CREATE TRIGGER trg_cerita_gresik_videos_updated_at
  BEFORE UPDATE ON public.cerita_gresik_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cerita_gresik_videos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cerita_gresik_videos FROM anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.cerita_gresik_videos TO anon;
GRANT ALL ON public.cerita_gresik_videos TO authenticated;

DROP POLICY IF EXISTS cerita_gresik_videos_anon_select_active ON public.cerita_gresik_videos;
CREATE POLICY cerita_gresik_videos_anon_select_active
  ON public.cerita_gresik_videos
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS cerita_gresik_videos_authenticated_all ON public.cerita_gresik_videos;
CREATE POLICY cerita_gresik_videos_authenticated_all
  ON public.cerita_gresik_videos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Salin data cadangan dari site_settings bila sudah sempat diisi sebelum migrasi tabel
INSERT INTO public.cerita_gresik_videos (title, description, video_url, sort_order, is_active)
SELECT
  COALESCE(NULLIF(BTRIM(elem->>'title'), ''), 'Video Cerita Gresik'),
  COALESCE(elem->>'description', ''),
  COALESCE(elem->>'video_url', ''),
  COALESCE((elem->>'sort_order')::integer, 1),
  COALESCE((elem->>'is_active')::boolean, true)
FROM public.site_settings AS s,
     LATERAL jsonb_array_elements(COALESCE(s.value->'items', '[]'::jsonb)) AS elem
WHERE s.key = 'cerita_gresik_videos'
  AND BTRIM(COALESCE(elem->>'video_url', '')) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.cerita_gresik_videos);
