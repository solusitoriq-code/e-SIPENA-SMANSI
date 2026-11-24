 -- ============================================================================
-- Data Awal (Seed) — Portal Literasi Digital e-SIPENA SMAN 1 Sidayu
-- Sinkron dengan data/esipena_data.json
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 12 Novel Tahun 2026 (11 Siswa XI-XII + 1 Guru SAGUSABU)
-- ----------------------------------------------------------------------------
INSERT INTO public.books (
  id, slug, title, author_name, author_role, author_class,
  publication_year, category, synopsis, cover_url,
  gdrive_file_id, gdrive_preview_url, qrcbn_code,
  likes_count, sort_order, is_published, is_featured, is_placeholder
) VALUES
(
  '00000000-0000-4000-8000-000000000101',
  'dibalik-pantulan-cermin',
  'Dibalik Pantulan Cermin',
  'Nadine Zivana Khaalishah Rosyidi',
  'Siswa XI',
  'XI-7',
  2026,
  'Novel',
  'Kisah pergulatan batin seorang remaja yang mencari jati diri di balik ekspektasi lingkungan sekitar dan bayangan masa lalunya.',
  'assets/covers/01-dibalik-pantulan-cermin.webp',
  '', '', '', 18, 1, true, true, false
),
(
  '00000000-0000-4000-8000-000000000102',
  'angin-mendung-untukmu',
  'Angin Mendung Untukmu',
  'Devlin Kalevi Putra Kanaya',
  'Siswa XII',
  'XII-6',
  2026,
  'Novel',
  'Perjalanan persahabatan dan keteguhan hati saat menghadapi langit kelabu menjelang masa kelulusan dan perpisahan.',
  'assets/covers/02-angin-mendung-untukmu.webp',
  '', '', '', 15, 2, true, true, false
),
(
  '00000000-0000-4000-8000-000000000103',
  'fate-and-the-divine',
  'Fate and The Divine',
  'Puan Talida Bahira',
  'Siswa XII',
  'XII-11',
  2026,
  'Novel',
  'Pertemuan antara rencana manusia dan ketetapan takdir yang menuntun tokohnya memahami makna kesabaran serta keikhlasan.',
  'assets/covers/03-fate-and-the-divine.webp',
  '', '', '', 21, 3, true, true, false
),
(
  '00000000-0000-4000-8000-000000000104',
  'singgah',
  'Singgah',
  'Kyna Zhafirah Dimion',
  'Siswa XI',
  'XI-6',
  2026,
  'Novel',
  'Cerita tentang ruang-ruang persinggahan dalam hidup yang mengajarkan kapan harus bertahan dan kapan harus melangkah pergi.',
  'assets/covers/04-singgah.webp',
  '', '', '', 14, 4, true, false, false
),
(
  '00000000-0000-4000-8000-000000000105',
  'secangkir-matcha',
  'Secangkir Matcha',
  'Thalita Nabila Firdaus',
  'Siswa XII',
  'XII-5',
  2026,
  'Novel',
  'Kehangatan percakapan di sudut ruang baca yang merangkai kembali mimpi, persahabatan, dan keberanian memulai lembaran baru.',
  'assets/covers/05-secangkir-matcha.webp',
  '', '', '', 19, 5, true, false, false
),
(
  '00000000-0000-4000-8000-000000000106',
  'keluarga-yang-sesungguhnya',
  'Keluarga yang Sesungguhnya',
  'Ahmad Akif',
  'Siswa XI',
  'XI-6',
  2026,
  'Novel',
  'Refleksi menyentuh tentang arti rumah, dukungan tulus, dan ikatan keluarga yang lahir dari kepedulian di saat-saat terberat.',
  'assets/covers/06-keluarga-yang-sesungguhnya.webp',
  '', '', '', 16, 6, true, false, false
),
(
  '00000000-0000-4000-8000-000000000107',
  'esok-cerita-lagi',
  'Esok Cerita Lagi',
  'Gendhis Ajeng Kirana',
  'Siswa XII',
  'XII-8',
  2026,
  'Novel',
  'Catatan harian tentang harapan kecil yang menjaga semangat belajar dan persahabatan tetap menyala dari hari ke hari.',
  'assets/covers/07-esok-cerita-lagi.webp',
  '', '', '', 17, 7, true, false, false
),
(
  '00000000-0000-4000-8000-000000000108',
  'bukan-lingkaran-dosa',
  'Bukan Lingkaran Dosa',
  'Intan Nur Qaulan Sadida',
  'Siswa XI',
  'XI-5',
  2026,
  'Novel',
  'Drama moral tentang keberanian memutus prasangka, memaafkan kekeliruan, dan memilih jalan kejujuran di tengah tekanan sosial.',
  'assets/covers/08-bukan-lingkaran-dosa.webp',
  '', '', '', 12, 8, true, false, false
),
(
  '00000000-0000-4000-8000-000000000109',
  'sela-waktu',
  'Sela Waktu',
  'Nur Fajriyah ''Aini',
  'Siswa XII',
  'XII-8',
  2026,
  'Novel',
  'Kisah puitis mengenai jeda-jeda hening di antara kesibukan sekolah yang justru menyimpan keputusan terpenting dalam hidup.',
  'assets/covers/09-sela-waktu.webp',
  '', '', '', 13, 9, true, false, false
),
(
  '00000000-0000-4000-8000-000000000110',
  'etherea',
  'Etherea',
  'Naadhira Putri Maulidatur Rohmah',
  'Siswa XII',
  'XII-5',
  2026,
  'Novel',
  'Fiksi imajinatif tentang dunia cahaya dan keteguhan hati menjaga harapan ketika batas antara kenyataan dan mimpi diuji.',
  'assets/covers/10-etherea.webp',
  '', '', '', 20, 10, true, false, false
),
(
  '00000000-0000-4000-8000-000000000111',
  'perjalanan-angga-menuju-cahaya',
  'Perjalanan Angga Menuju Cahaya',
  'Natasya Syafa Kamilah',
  'Siswa XI',
  'XI-7',
  2026,
  'Novel',
  'Kisah inspiratif perjuangan seorang pelajar mengatasi keraguan diri melalui dukungan guru, buku, dan ketekunan berkarya.',
  'assets/covers/11-perjalanan-angga-menuju-cahaya.webp',
  '', '', '', 16, 11, true, false, false
),
(
  '00000000-0000-4000-8000-000000000112',
  'diantara-luka-dan-sajadah',
  'Diantara Luka dan Sajadah',
  'Mas''Idah',
  'Guru',
  'Guru',
  2026,
  'Novel',
  'Karya reflektif pendidik SAGUSABU tentang ketabahan jiwa, doa yang menenangkan luka batin, dan pengabdian tulus di dunia pendidikan.',
  'assets/covers/12-diantara-luka-dan-sajadah.webp',
  '', '', '', 24, 12, true, true, false
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  author_name = EXCLUDED.author_name,
  author_role = EXCLUDED.author_role,
  author_class = EXCLUDED.author_class,
  publication_year = EXCLUDED.publication_year,
  category = EXCLUDED.category,
  synopsis = EXCLUDED.synopsis,
  cover_url = EXCLUDED.cover_url,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  is_featured = EXCLUDED.is_featured;

-- ----------------------------------------------------------------------------
-- 2. 3 Koleksi Pameran 3D Gresik (Damar Kurung, Jubung, Pudak)
-- ----------------------------------------------------------------------------
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
  1, true
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
  2, true
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
  3, true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  introduction = EXCLUDED.introduction,
  category = EXCLUDED.category,
  model_path = EXCLUDED.model_path,
  placeholder_url = EXCLUDED.placeholder_url,
  audio_path = EXCLUDED.audio_path,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 3. 8 Karya Mading Awal (Placeholder Siswa X-XII, Guru, Tendik)
-- 3. Data awal naskah (submissions) dikosongkan agar kurasi dimulai dari kiriman riil
-- ----------------------------------------------------------------------------
INSERT INTO public.submissions (
  id, tracking_code, title, author_name, author_role, author_class_unit,
  category, culture_theme, summary, body_text,
  gdrive_file_id, gdrive_view_url, gdrive_preview_url,
  file_name, file_size_bytes, contact_wa, anti_plagiarism_agreed,
  status, reviewer_notes, is_placeholder, published_at
) VALUES
(
  '00000000-0000-4000-8000-000000000301',
  'SPN-DEMO01',
  'Lampu Lentera di Teras Sidayu',
  'Rania Putri Maheswari',
  'Siswa X',
  'X-3',
  'Cerpen',
  'Damar Kurung Masmundari: Lentera Bercerita dari Masa Lampau',
  'Cerpen singkat tentang remaja kelas X yang menemukan kembali arti kebersamaan keluarga lewat kerajinan Damar Kurung.',
  'Sore itu hujan turun tipis di beranda rumah nenek di Sidayu. Di atas meja kayu, rangka bambu kecil dan kertas minyak bergambar barisan penari mulai dirangkai kembali. Nenek bercerita bahwa setiap warna pada Damar Kurung bukan sekadar hiasan, melainkan doa agar rumah selalu diterangi kisah-kisah baik.',
  '', '', '', 'demo-spn-01.pdf', 0, '', true,
  'Lolos Mading', 'Karya awal placeholder siap tayang di Mading Digital.', true, now() - interval '7 days'
),
(
  '00000000-0000-4000-8000-000000000302',
  'SPN-DEMO02',
  'Sajak Pagi dari Gerbang Lentera',
  'Bagas Pratama Wijaya',
  'Siswa X',
  'X-8',
  'Puisi',
  '',
  'Puisi empat bait tentang langkah pertama siswa baru menyusuri koridor perpustakaan sekolah.',
  'Di balik gerbang biru pagi ini / ribuan halaman menunggu disentuh jemari / bukan sekadar huruf yang diam di rak tinggi / melainkan jendela menuju luasnya negeri. // Setiap kalimat adalah bekal perjalanan / menuntun pikiran jauh melampaui keraguan.',
  '', '', '', 'demo-spn-02.pdf', 0, '', true,
  'Lolos Mading', 'Diterima sebagai contoh puisi siswa kelas X.', true, now() - interval '6 days'
),
(
  '00000000-0000-4000-8000-000000000303',
  'SPN-DEMO03',
  'Membaca Nilai Pesisir dalam Tradisi Pasar Bandeng',
  'Salsabila Nur Rahmah',
  'Siswa XI',
  'XI-2',
  'Esai Budaya',
  'Pasar Bandeng dan Otak-Otak Bandeng: Simbol Kemakmuran Pesisir',
  'Esai budaya mengenai kearifan lokal petambak pesisir Gresik Utara dan etos gotong royong masyarakat.',
  'Tradisi Pasar Bandeng bukan semata transaksi ekonomi tahunan. Ia merangkum pengetahuan ekologi tambak payau, penghargaan atas hasil bumi, serta silaturahmi lintas generasi warga pesisir Gresik hingga Sidayu.',
  '', '', '', 'demo-spn-03.pdf', 0, '', true,
  'Masuk Antologi', 'Rekomendasi kurator untuk antologi budaya sekolah.', true, now() - interval '5 days'
),
(
  '00000000-0000-4000-8000-000000000304',
  'SPN-DEMO04',
  'Ulasan Novel: Diantara Luka dan Sajadah',
  'Muhammad Farel Alamsyah',
  'Siswa XI',
  'XI-9',
  'Resensi Buku',
  '',
  'Resensi kritis dan reflektif atas karya guru SMAN 1 Sidayu berjudul Diantara Luka dan Sajadah.',
  'Membaca Diantara Luka dan Sajadah membawa pembaca pada ruang perenungan yang tenang namun menggugah. Bahasa yang terjaga rapi menjadikan kisah ketabahan pendidik terasa dekat dengan keseharian siswa di sekolah.',
  '', '', '', 'demo-spn-04.pdf', 0, '', true,
  'Lolos Mading', 'Layak tampil di rubrik resensi Mading Digital.', true, now() - interval '4 days'
),
(
  '00000000-0000-4000-8000-000000000305',
  'SPN-DEMO05',
  'Dari Bukit Giri ke Ruang Baca Digital',
  'Alya Khairunnisa',
  'Siswa XII',
  'XII-4',
  'Esai Budaya',
  'Joko Samudro dan Bukit Giri: Cahaya Ilmu dari Bumi Gresik',
  'Refleksi pelajar kelas XII tentang transformasi tradisi keilmuan Bukit Giri di era perpustakaan digital.',
  'Berabad silam para penuntut ilmu mendaki Bukit Giri membawa catatan tulis tangan. Kini, semangat yang sama hadir di ruang baca digital e-SIPENA tempat generasi muda SMAN 1 Sidayu merawat gagasan lewat tulisan.',
  '', '', '', 'demo-spn-05.pdf', 0, '', true,
  'Masuk Antologi', 'Terpilih masuk draft antologi pelajar 2026.', true, now() - interval '3 days'
),
(
  '00000000-0000-4000-8000-000000000306',
  'SPN-DEMO06',
  'Sepincuk Krawu di Akhir Semester',
  'Dimas Ardiansyah Putra',
  'Siswa XII',
  'XII-10',
  'Cerpen',
  'Pudak dan Nasi Krawu: Harmoni Rasa dan Kesabaran dalam Sajian',
  'Kisah persahabatan tiga sahabat kelas XII yang merayakan selesai ujian praktik dengan nasi krawu buatan ibu.',
  'Aroma daun pisang hangat dan serundeng gurih seketika mencairkan ketegangan setelah pengumuman nilai ujian. Kami belajar bahwa kesabaran dalam proses belajar selalu berakhir manis seperti sajian sederhana penuh syukur.',
  '', '', '', 'demo-spn-06.pdf', 0, '', true,
  'Lolos Mading', 'Memenuhi standar bahasa dan keaslian karya.', true, now() - interval '2 days'
),
(
  '00000000-0000-4000-8000-000000000307',
  'SPN-DEMO07',
  'Menumbuhkan Budaya Menulis Mulai dari Ruang Kelas',
  'Dra. Siti Aminah, M.Pd.',
  'Guru',
  'Guru Bahasa Indonesia',
  'Artikel Literasi',
  '',
  'Catatan praktik baik guru pendamping literasi dalam membimbing siswa menghasilkan 12 novel tahun 2026.',
  'Setiap siswa sesungguhnya memiliki cerita yang layak dibukukan. Kuncinya terletak pada pendampingan konsisten selama lima belas menit menulis bebas sebelum pelajaran dimulai serta ruang publikasi yang menghargai karya mereka.',
  '', '', '', 'demo-spn-07.pdf', 0, '', true,
  'Masuk Antologi', 'Artikel referensi untuk rubrik Guru Menulis.', true, now() - interval '1 day'
),
(
  '00000000-0000-4000-8000-000000000308',
  'SPN-DEMO08',
  'Di Balik Rak Buku: Merawat Akses Bacaan Sekolah',
  'Ahmad Fauzan, S.IP.',
  'Tendik',
  'Tenaga Perpustakaan',
  'Artikel Literasi',
  '',
  'Perspektif tenaga kependidikan perpustakaan dalam menjembatani katalog cetak ber-QRCBN dengan portal digital.',
  'Perpustakaan bukan hanya tempat menyimpan buku, melainkan simpul pertemuan ide warga sekolah. Digitalisasi katalog lewat QR Code memudahkan siswa meminjam buku fisik sekaligus membaca pratinjau karya rekan sebayanya.',
  '', '', '', 'demo-spn-08.pdf', 0, '', true,
  'Lolos Mading', 'Publikasi awal kolaborasi Tendik dan Perpustakaan.', true, now() - interval '12 hours'
)
ON CONFLICT (tracking_code) DO UPDATE SET
  title = EXCLUDED.title,
  author_name = EXCLUDED.author_name,
  author_role = EXCLUDED.author_role,
  author_class_unit = EXCLUDED.author_class_unit,
  category = EXCLUDED.category,
  culture_theme = EXCLUDED.culture_theme,
  summary = EXCLUDED.summary,
  body_text = EXCLUDED.body_text,
  status = EXCLUDED.status,
  is_placeholder = EXCLUDED.is_placeholder;

-- ----------------------------------------------------------------------------
-- 4. Site Settings (Profil Sekolah, KPI, Kontak Placeholder, Sudut Pustakawan)
-- ----------------------------------------------------------------------------
INSERT INTO public.site_settings (key, value, description, is_public, is_placeholder)
VALUES
(
  'school_profile',
  '{
    "name": "SMA Negeri 1 Sidayu",
    "short_name": "SMAN 1 Sidayu",
    "library_name": "Perpustakaan Lentera Ilmu",
    "community_name": "NLC (Naskah Literasi Cendekia)",
    "address": "Jl. Kanjeng Pangeran No. 1, Sidayu, Gresik, Jawa Timur",
    "tagline": "Portal Literasi Digital & Antologi Karya Warga Sekolah",
    "logo_url": "assets/images/logo-smansi.webp"
  }'::jsonb,
  'Identitas resmi SMA Negeri 1 Sidayu dan Perpustakaan Lentera Ilmu',
  true,
  false
),
(
  'kpi_stats',
  '{
    "books_2025_count": 23,
    "novels_2026_count": 12,
    "cultural_topics_count": 5,
    "program_badge": "Program Literasi 2025-2026"
  }'::jsonb,
  'Angka capaian literasi sekolah (23 Buku 2025 + 12 Novel 2026)',
  true,
  false
),
(
  'contact_admin',
  '{
    "whatsapp_number": "6281234567890",
    "whatsapp_label": "Pustakawan SMAN 1 Sidayu",
    "email": "perpustakaan@sman1sidayu.sch.id",
    "order_message_prefix": "Halo Pustakawan e-SIPENA SMAN 1 Sidayu, saya ingin memesan atau menanyakan buku:"
  }'::jsonb,
  'Nomor WhatsApp dan email resmi admin/pustakawan (placeholder siap edit)',
  true,
  true
),
(
  'librarian_corner',
  '{
    "headline": "Sudut Pustakawan & Kegiatan Literasi",
    "service_hours": "Senin - Jumat, 07.00 - 15.00 WIB"
  }'::jsonb,
  'Jadwal layanan perpustakaan di menu Sudut Pustakawan',
  true,
  false
),
(
  'portal_links',
  '{
    "portal_url": "https://esipena-smansi.pages.dev",
    "gdrive_upload_endpoint": "",
    "note": "Tempelkan URL Web App Apps Script di js/config.js atau perbarui lewat Ruang Pustakawan"
  }'::jsonb,
  'Tautan utama portal untuk QR Code dan endpoint upload Google Drive',
  true,
  true
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  is_placeholder = EXCLUDED.is_placeholder;
