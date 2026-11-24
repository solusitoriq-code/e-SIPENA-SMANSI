-- ============================================================================
-- Migrasi Database Existing — e-SIPENA SMAN 1 Sidayu
-- Menghapus kolom excerpt (Cuplikan / Teks Baca Offline) pada tabel public.books
-- setelah pembaruan kode frontend selesai diterapkan.
-- ============================================================================

ALTER TABLE public.books
  DROP COLUMN IF EXISTS excerpt;

NOTIFY pgrst, 'reload schema';
