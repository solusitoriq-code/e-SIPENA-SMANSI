-- ============================================================================
-- Migrasi: Mengganti menu Jejak Budaya Gresik dengan Pameran 3D Gresik (models_3d)
-- Jalankan skrip ini di SQL Editor Supabase jika database sebelumnya sudah dibuat.
-- ============================================================================

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

ALTER TABLE public.models_3d
  ADD COLUMN IF NOT EXISTS audio_path text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_models_3d_active_sort
  ON public.models_3d (is_active, sort_order);

DROP TRIGGER IF EXISTS trg_models_3d_updated_at ON public.models_3d;
CREATE TRIGGER trg_models_3d_updated_at
  BEFORE UPDATE ON public.models_3d
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.models_3d ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.models_3d FROM anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.models_3d TO anon;
GRANT ALL ON public.models_3d TO authenticated;

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

INSERT INTO public.models_3d (
  id, slug, title, introduction, category, model_path, placeholder_url, audio_path, sort_order, is_active
) VALUES
(
  '00000000-0000-4000-8000-000000000301',
  'damar-kurung-gresik',
  'Damar Kurung Khas Gresik',
  'Damar Kurung adalah lentera tradisional khas Gresik yang dipopulerkan oleh maestro seni lukis Mbah Masmundari. Empat sisi lampion ini dihiasi lukisan dua dimensi yang dibaca berurutan dari bawah ke atas, menggambarkan denyut kehidupan masyarakat pesisir, suasana pasar, hingga tradisi menyambut bulan suci Ramadan. Selain menjadi penerang malam, Damar Kurung merupakan wujud literasi visual yang merekam kearifan lokal warga Gresik lintas generasi.',
  'Seni & Tradisi',
  'assets/3d_models/damar-kurung-3d.glb',
  'assets/placeholders/damar_kurung__placeholder.jpeg',
  'assets/audios/damar-kurung-audio.mpeg',
  1,
  true
),
(
  '00000000-0000-4000-8000-000000000302',
  'jubung-gresik',
  'Jubung Kuliner Tradisional Gresik',
  'Jubung adalah jajanan tradisional khas Gresik yang terbuat dari tepung ketan hitam, santan kelapa, dan gula merah yang dimasak hingga kenyal serta legit, lalu ditaburi biji wijen sangrai di atasnya. Keunikan Jubung terletak pada kemasannya yang berbentuk tabung kecil dari seludang atau upih daun pinang kering. Perpaduan rasa manis gurih dan kemasan alami ini mencerminkan kesabaran serta kecerdasan kuliner masyarakat pesisir Gresik.',
  'Kuliner Khas',
  'assets/3d_models/jubung-3d.glb',
  'assets/placeholders/jubung__placeholder.jpeg',
  'assets/audios/jubung-audio.mpeg',
  2,
  true
),
(
  '00000000-0000-4000-8000-000000000303',
  'pudak-gresik',
  'Pudak Kue Khas Kota Gresik',
  'Pudak adalah kue basah ikonik dari Kabupaten Gresik yang diolah dari campuran tepung beras, gula pasir atau gula jawa, serta santan kelapa, dengan varian rasa putih, gula merah, sagu, hingga pandan yang harum. Adonan pudak dibungkus menggunakan pelepah daun pinang yang disebut ope, lalu diikat rapi dan dikukus hingga padat serta lembut. Hidangan ini menjadi buah tangan kebanggaan Gresik yang terus lestari dari tradisi masyarakat pesisir hingga masa kini.',
  'Kuliner Khas',
  'assets/3d_models/pudak-3d.glb',
  'assets/placeholders/pudak_placeholder.png',
  'assets/audios/pudak-audio.mpeg',
  3,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  audio_path = CASE
    WHEN COALESCE(public.models_3d.audio_path, '') = '' THEN EXCLUDED.audio_path
    ELSE public.models_3d.audio_path
  END;

DROP TABLE IF EXISTS public.culture_prompts;
