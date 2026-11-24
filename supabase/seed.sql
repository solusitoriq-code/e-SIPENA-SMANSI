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
-- 2. 5 Topik Jejak Budaya Gresik (Placeholder Terstruktur)
-- ----------------------------------------------------------------------------
INSERT INTO public.culture_prompts (
  id, slug, title, subtitle, youtube_id, article_summary, writing_prompt,
  location_tag, duration_label, sort_order, is_active, is_placeholder
) VALUES
(
  '00000000-0000-4000-8000-000000000201',
  'joko-samudro-dan-bukit-giri',
  'Joko Samudro dan Bukit Giri: Cahaya Ilmu dari Bumi Gresik',
  'Warisan pendidikan, akhlak, dan tradisi keilmuan Sunan Giri untuk generasi pelajar.',
  '',
  'Bukit Giri menjadi pusat syiar ilmu, seni, dan tata nilai masyarakat pesisir Gresik sejak abad ke-15. Nilai ketekunan menuntut ilmu dari kisah Joko Samudro menginspirasi semangat literasi pelajar SMAN 1 Sidayu.',
  'Tuliskan cerpen atau esai reflektif tentang bagaimana keteladanan menuntut ilmu di Bukit Giri relevan dengan tantangan pelajar masa kini.',
  'Giri, Gresik',
  '04:30',
  1, true, true
),
(
  '00000000-0000-4000-8000-000000000202',
  'damar-kurung-masmundari',
  'Damar Kurung Masmundari: Lentera Bercerita dari Masa Lampau',
  'Seni lukis lampion khas Gresik karya Mbah Masmundari yang merekam denyut kehidupan warga.',
  '',
  'Setiap sisi Damar Kurung menampilkan panel kisah rakyat, pasar, dan tradisi Ramadan yang diceritakan secara visual dari bawah ke atas. Lentera kertas ini merupakan wujud literasi visual masyarakat Gresik.',
  'Bayangkan satu panel Damar Kurung menyala di depan rumahmu; ceritakan kisah di balik gambar panel tersebut dalam bentuk cerpen atau puisi.',
  'Kota Gresik',
  '05:10',
  2, true, true
),
(
  '00000000-0000-4000-8000-000000000203',
  'pasar-bandeng-dan-otak-otak-bandeng',
  'Pasar Bandeng dan Otak-Otak Bandeng: Simbol Kemakmuran Pesisir',
  'Tradisi ekonomi rakyat pesisir utara Jawa yang merajut kebersamaan menjelang Idulfitri.',
  '',
  'Pasar Bandeng di Gresik dan kawasan pesisir Sidayu–Ujungpangkah memperlihatkan eratnya hubungan tambak, keluarga, dan gotong royong warga. Pengolahan otak-otak bandeng membutuhkan ketelitian dan kesabaran tinggi.',
  'Susun esai budaya atau resensi kisah keluarga yang berlatar suasana riuh Pasar Bandeng dan proses mengolah bandeng khas pesisir.',
  'Pesisir Gresik & Sidayu',
  '04:15',
  3, true, true
),
(
  '00000000-0000-4000-8000-000000000204',
  'pudak-dan-nasi-krawu',
  'Pudak dan Nasi Krawu: Harmoni Rasa dan Kesabaran dalam Sajian',
  'Kuliner tradisional Gresik yang menyimpan filosofi ketelatenan dan penghargaan pada alam.',
  '',
  'Kemasan pelepah pinang (ope) pada pudak dan racikan serundeng kelapa pada nasi krawu mencerminkan kecerdasan lokal menjaga cita rasa tanpa meninggalkan akar tradisi.',
  'Ceritakan kenangan atau makna filosofis dari sepotong pudak maupun sepincuk nasi krawu sebagai metafora perjalanan hidup.',
  'Gresik Selatan & Utara',
  '03:55',
  4, true, true
),
(
  '00000000-0000-4000-8000-000000000205',
  'bukit-surowiti-dan-petilasan-sunan-kalijaga',
  'Bukit Surowiti dan Petilasan Sunan Kalijaga: Jejak Sunyi di Puncak Kapur',
  'Panorama perbukitan Panceng–Sidayu sebagai ruang perenungan sejarah dan alam.',
  '',
  'Terletak tidak jauh dari wilayah Sidayu, kawasan perbukitan kapur Surowiti memadukan keindahan bentang alam dengan jejak sejarah spiritual Sunan Kalijaga dan tokoh lokal.',
  'Tulis puisi atau catatan perjalanan imajinatif saat menapaki tangga batu Bukit Surowiti sambil merenungkan pesan pelestarian budaya lokal.',
  'Panceng - Sidayu, Gresik',
  '04:50',
  5, true, true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  article_summary = EXCLUDED.article_summary,
  writing_prompt = EXCLUDED.writing_prompt,
  location_tag = EXCLUDED.location_tag,
  duration_label = EXCLUDED.duration_label,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 3. 8 Karya Mading Awal (Placeholder Siswa X-XII, Guru, Tendik)
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
    "headline": "Sudut Pustakawan & Panduan Literasi",
    "service_hours": "Senin - Jumat, 07.00 - 15.00 WIB",
    "documents": [
      {
        "id": "doc-pedoman-karya",
        "title": "Pedoman Penulisan & Unggah PDF (Maks. 3 MB)",
        "category": "Panduan Penulis",
        "summary": "Tata cara menyusun naskah cerpen, puisi, resensi, dan esai budaya dalam format PDF siap kurasi.",
        "url": "",
        "updated_label": "Edisi 2026 (Placeholder)"
      },
      {
        "id": "doc-anti-plagiat",
        "title": "Etika Anti-Plagiasi & Orisinalitas Karya Warga Sekolah",
        "category": "Kode Etik",
        "summary": "Ketentuan keaslian naskah tanpa salin-tempel maupun penggunaan teks AI tanpa penyuntingan kreatif.",
        "url": "",
        "updated_label": "Edisi 2026 (Placeholder)"
      },
      {
        "id": "doc-alur-kurasi",
        "title": "Alur Kurasi Mading Digital & Seleksi Antologi",
        "category": "Kurasi NLC",
        "summary": "Tahapan pemeriksaan oleh Tim Pustakawan & Guru Pembina dari Menunggu Kurasi hingga Masuk Antologi.",
        "url": "",
        "updated_label": "Edisi 2026 (Placeholder)"
      },
      {
        "id": "doc-katalog-2025",
        "title": "Rekam Jejak Program 23 Buku Karya 2025",
        "category": "Arsip Program",
        "summary": "Ringkasan capaian 23 buku tahun 2025 yang menjadi fondasi lahirnya 12 Novel SMAN 1 Sidayu 2026.",
        "url": "",
        "updated_label": "Arsip 2025 (Placeholder)"
      }
    ]
  }'::jsonb,
  'Dokumen panduan & jadwal layanan di menu Sudut Pustakawan (placeholder siap edit)',
  true,
  true
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
