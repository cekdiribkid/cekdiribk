/**
 * Default content for the "Pelajari Lebih Lanjut" feature on the landing page.
 *
 * This content is shown publicly (before login) when a visitor clicks the
 * glowing "Pelajari Lebih Lanjut" block and chooses either the
 * "Siswa" or "Admin/Konselor/Guru" option.
 *
 * Admins can edit this content from the Pengaturan (Admin Settings) page;
 * the edited version is persisted in the `Setting` table and overrides
 * these defaults.
 *
 * Supported markdown-lite syntax (see `renderLearnMoreMarkdown` in
 * app-shared.tsx):
 *   ## Heading 2
 *   ### Heading 3
 *   #### Heading 4
 *   - bullet item
 *   **bold text**
 *   plain paragraph
 *   (empty line separates blocks)
 */

export const DEFAULT_LEARN_MORE_STUDENT_TITLE = "Panduan Fitur untuk Siswa";

export const DEFAULT_LEARN_MORE_STUDENT_CONTENT = `CekDiriBK.id adalah platform self-assessment (penilaian diri) berbasis **Daftar Cek Masalah (DCM)**. Kamu menjawab pernyataan dengan IYA/TIDAK, lalu sistem menghitung persentase dan memberikan rekomendasi. Jawabanmu dijaga kerahasiaannya dan hanya digunakan untuk membantumu.

## 1. Halaman Awal: Login & Registrasi
- **Login**: masukkan Email + Password, klik "Masuk". Tombol mata untuk lihat/sembunyikan password.
- **Daftar** (klik "Daftar sekarang"): isi Nama Lengkap, Email, No. WhatsApp, Jenis Kelamin, Password (min. 6 karakter), Konfirmasi Password, dan Jenjang Kelas (7/8/9).
- **Foto Profil opsional**: bisa diupload saat daftar (maks. 2MB). Jika tidak, tampil avatar kartun sesuai jenis kelamin.
- Validasi real-time: field kosong/salah diberi border merah.
- Profil sekolah dan tombol WhatsApp tampil di halaman ini.

## 2. Selamat Datang (Dashboard Siswa)
- Banner welcome dengan **foto profilmu** + greeting personal.
- 3 kartu statistik: Survey Tersedia, Survey Selesai, Belum Dikerjakan.
- 4 kartu bidang DCM (Pribadi, Sosial, Belajar, Karir) dengan status "Mulai" atau "Selesai".
- Aksi Cepat: shortcut ke DCM, Hasil Analisa, dan Profil.

## 3. Daftar Cek Masalah (DCM)
- Menampilkan 4 bidang assessment sesuai jenjang kelas.
- Filter bidang instan (Semua / Pribadi / Sosial / Belajar / Karir).
- Klik kartu yang belum selesai untuk mulai mengerjakan, klik yang sudah selesai untuk lihat hasil.

## 4. Mengerjakan Survey
- Satu pernyataan per layar (fokus, tidak overwhelming).
- 2 tombol besar: **IYA** (merah) dan **TIDAK** (hijau).
- Progress bar real-time (X dari N terjawab).
- Navigasi Sebelumnya/Berikutnya; jawaban tersimpan di state.
- Setelah semua dijawab, klik "Selesai & Kirim".

## 5. Hasil Analisa
- 4 kartu ringkasan per bidang dengan pie chart mini, persentase TIDAK, dan grade (A/B/C).
- **Grade A** = Baik (100% TIDAK), **B** = Cukup (75-99%), **C** = Kurang (<75%).
- Klik bidang untuk lihat detail: kop surat sekolah, profil siswa dengan foto, pie chart besar, tabel per pernyataan, daftar masalah teridentifikasi (yang dijawab IYA), rekomendasi spesifik.
- Tombol **Download PDF** untuk cetak hasil analisa.

## 6. Laporan Survey
- Laporan komprehensif semua hasil survey dalam satu dokumen siap cetak.
- Format: Kop Surat Sekolah + Profil Siswa (dengan foto) + per bidang (pie chart + tabel lengkap) + ringkasan overall + grade.
- Tombol **Download PDF**.

## 7. Sertifikat
- Sertifikat penghargaan untuk siswa yang menyelesaikan **semua 4 bidang DCM dengan grade A (100% TIDAK)**.
- Desain elegan: border emas, ornamen, foto siswa, nama, kelas, tahun ajaran, grade, tanda tangan.
- Tombol **Download PDF** + **Print**.
- Jika belum memenuhi syarat, tampil pesan info.

## 8. Profil
- Mode Lihat: foto profil besar, badge info (Kelas, Jenis Kelamin, Role), field data diri, link WhatsApp.
- Mode Edit: upload/hapus foto, edit nama/email/jenis kelamin/WhatsApp, ubah password (opt-in).

## Fitur Tambahan untuk Siswa
- **Auto-Logout 30 Menit**: jika tidak aktif 30 menit, auto-logout dengan peringatan 5 menit sebelumnya.
- **Collapsible Menu**: menu Siswa di sidebar bisa di-collapse/expand.
- **Foto Profil & Avatar Kartun**: jika belum upload foto, tampil avatar kartun laki-laki/perempuan sesuai jenis kelamin.
- **Avatar tampil di**: Welcome, Profil, Sertifikat, Laporan Survey, Hasil Analisa.

## Alur Penggunaan Siswa
1. Daftar (dengan foto opsional) → Login
2. Selamat Datang → lihat progress → klik bidang yang belum selesai
3. Kerjakan Survey (sekitar 20-30 pernyataan IYA/TIDAK per bidang)
4. Hasil Analisa → lihat persentase, grade, rekomendasi, download PDF
5. Laporan Survey → cetak laporan lengkap semua bidang
6. Sertifikat → jika memenuhi syarat, download sertifikat
7. Profil → edit data diri/foto/password kapan saja

Kredensial login siswa: dibuat sendiri via halaman registrasi, atau di-import admin via Excel.`;

export const DEFAULT_LEARN_MORE_ADMIN_TITLE = "Panduan Fitur untuk Guru/Konselor (Admin)";

export const DEFAULT_LEARN_MORE_ADMIN_CONTENT = `Admin (Guru BK/Konselor) memiliki 11 menu di section **Menu Admin** sidebar. Menu ini hanya muncul untuk user dengan role ADMIN.

## Ringkasan Fitur per Menu
- **Dashboard Admin**: statistik global + grafik + respons terbaru.
- **Kelola User**: monitoring siswa, edit data/foto/password, hapus user.
- **Kelola Survey**: CRUD survey (DCM) & pernyataan di dalamnya.
- **Konseling BK**: kelola sesi konseling + Generate AI catatan/solusi + cetak kartu.
- **Hasil Analisa**: drill-down hasil DCM per siswa + chart distribusi.
- **Sertifikat**: cetak sertifikat untuk siswa yang memenuhi syarat.
- **Log Visitor**: audit trail aktivitas login siswa & admin.
- **Monitoring**: tracking real-time progress DCM semua siswa.
- **Laporan Survey**: generate laporan per siswa (arsip/rapor).
- **Import / Export**: migrasi data massal (Excel .xlsx).
- **Pengaturan**: profil sekolah, logo, konfigurasi AI, dan konten "Pelajari Lebih Lanjut".

## 1. Dashboard Admin
- 4 Stats Cards: Total User, Total Survey, Total Response, Selesai.
- 2 Bar Charts: distribusi siswa per kelas + statistik jawaban per bidang (IYA vs TIDAK).
- Tabel Respons Terbaru: Siswa, Survey, Bidang, Tanggal.

## 2. Kelola User
- **Search multi-field** (nama/kelas/WA/email) yang persisten lintas tab.
- 4 Tabs: Monitoring, Selesai, Belum Selesai, User Admin.
- **Foto siswa** tampil di semua tabel (fallback avatar kartun L/P).
- Edit dialog: upload/hapus foto, edit data, ubah password, ubah role.
- Self-delete protection (tidak bisa hapus diri sendiri).

## 3. Kelola Survey
- List survey sebagai kartu expandable dengan badge kelas/bidang/jumlah soal.
- **Inline edit/add/delete** question tanpa dialog terpisah (Enter simpan, Esc batal).
- Re-index otomatis question order setelah hapus.
- Switch Aktif/Nonaktif untuk menonaktifkan survey dari DCM siswa.

## 4. Konseling BK
- **Search + 3 filter** (status, kelas, bidang).
- Dialog Tambah/Edit Sesi: pilih siswa (muncul **card foto siswa**), tanggal, bidang, status, topik otomatis dari jawaban IYA, ringkasan, petugas BK.
- **Tombol "Generate AI Semua"**: generate Catatan, Tindak Lanjut, dan Solusi via AI (butuh konfigurasi AI di Pengaturan).
- **Kartu Konseling** printable PDF: kop surat + profil siswa + foto + detail sesi + topik + catatan + solusi.

## 5. Hasil Analisa (Admin)
- Filter: search (nama/kelas/WA), filter kelas, filter bidang.
- Chart distribusi: bar chart persentase per bidang untuk siswa terfilter.
- Tabel Siswa: Nama+foto, Kelas, persentase per bidang, Grade Overall.
- Klik siswa → **Admin Analysis Detail**: profil + foto, pie chart per bidang, tabel detail jawaban, rekomendasi.

## 6. Sertifikat (Admin)
- Filter: search (nama/email), filter kelas, filter status (Semua/Memenuhi Syarat/Belum).
- List siswa sebagai kartu dengan **foto siswa** (fallback avatar kartun L/P), progress 4 bidang, grade.
- Klik "Lihat Sertifikat" → halaman Certificate dengan desain elegan + foto siswa + tombol **Download PDF** + **Print**.
- Validasi otomatis kelayakan: all 4 bidang selesai + 100% TIDAK.

## 7. Log Visitor
- Filter: search (nama user), filter role (Admin/User), filter rentang tanggal.
- Stats cards: Total Visitor, Hari Ini, Minggu Ini, Unik.
- Tabel: Avatar inisial, Nama, Role, Email, Login/Logout Time, Duration, Status (Online/Offline).
- Aksi: hapus per baris, hapus semua terfilter, export CSV.

## 8. Monitoring
- Filter: search (nama/kelas/WA), filter kelas, filter bidang.
- Chart distribusi: stacked bar IYA vs TIDAK per bidang (otomatis ter-filter).
- Stats cards: Total Siswa, Selesai Semua, Dalam Proses, Belum Mulai.
- Tabel detail siswa dengan foto + progress per bidang + persentase overall.
- Tombol **Cetak Monitoring**: format dokumen printable dengan kop surat + tabel.

## 9. Laporan Survey (Admin)
- Student Selector: dropdown "Pilih Siswa" → muncul **card foto siswa** (80x80) dengan nama, kelas, jenis kelamin, WhatsApp.
- Dokumen laporan: Kop Surat + Profil Siswa (dengan foto) + per bidang (pie chart + tabel lengkap pernyataan + jawaban) + ringkasan overall + grade.
- Tombol **Download PDF**.

## 10. Import / Export
- **Tab Import**: upload file .xlsx (template disediakan), pilih bidang & kelas target, preview data, batch insert.
- **Tab Export**: pilih Assessment Results atau Survey Questions, filter kelas/bidang, download .xlsx.
- Untuk migrasi data massal antar periode/tahun ajaran.

## 11. Pengaturan
- **Profil Sekolah**: nama, alamat, NPSN, telepon, email, kepala sekolah, koordinator BK, NIP, tahun ajaran.
- **Upload Logo Sekolah** (PNG/JPG/SVG/WebP, maks 2MB, base64) → langsung tampil di sidebar & kop surat.
- **Konfigurasi AI**: pilih provider (Groq/OpenAI/Z-AI/Custom), input API Key, model, base URL. Tombol Validasi Key + Tes Koneksi + Tes Generate.
- **Konten "Pelajari Lebih Lanjut" Beranda**: edit judul & isi untuk Siswa dan Admin/Guru, toggle aktif/nonaktif. Tampil di beranda sebelum login.

## Alur Penggunaan Admin (Guru BK)
1. Login sebagai admin (admin@cekdiribk.id / admin123).
2. Dashboard Admin → overview statistik.
3. Kelola Survey → buat/edit survey & pernyataan (sekali setup).
4. Kelola User → monitoring siswa, edit data jika perlu.
5. Monitoring → tracking progress real-time siswa.
6. Hasil Analisa → drill-down hasil per siswa.
7. Konseling BK → buat sesi konseling + Generate AI catatan untuk siswa bermasalah.
8. Sertifikat → cetak sertifikat untuk siswa yang memenuhi syarat.
9. Laporan Survey → generate laporan per siswa untuk arsip/rapor.
10. Log Visitor → audit trail aktivitas login.
11. Import/Export → migrasi data massal (Excel).
12. Pengaturan → konfigurasi sekolah, logo, AI, dan konten beranda.

## Catatan Penting
- **AI Features** (Generate catatan/solusi di Konseling BK) membutuhkan AI config di Pengaturan. Jika belum di-config, tombol Generate AI tidak berfungsi.
- **Print/PDF**: Hasil Analisa, Laporan Survey, Sertifikat, Kartu Konseling, Monitoring — semua bisa di-download PDF.
- **Search**: 6 halaman admin punya search box (Kelola User, Konseling BK, Hasil Analisa, Sertifikat, Log Visitor, Monitoring).
- **Photo Display**: foto siswa tampil di 8+ lokasi dengan fallback avatar kartun L/P.
- **Auto-Logout**: hanya berlaku untuk siswa (30 menit idle). Admin tidak terkena.`;

/**
 * Get the default value for a learn-more setting key.
 * Returns empty string for unknown keys.
 */
export function getDefaultLearnMoreValue(key: string): string {
  switch (key) {
    case "learnMoreEnabled":
      return "true";
    case "learnMoreStudentTitle":
      return DEFAULT_LEARN_MORE_STUDENT_TITLE;
    case "learnMoreStudentContent":
      return DEFAULT_LEARN_MORE_STUDENT_CONTENT;
    case "learnMoreAdminTitle":
      return DEFAULT_LEARN_MORE_ADMIN_TITLE;
    case "learnMoreAdminContent":
      return DEFAULT_LEARN_MORE_ADMIN_CONTENT;
    default:
      return "";
  }
}

/**
 * List of all learn-more setting keys (in display order).
 */
export const LEARN_MORE_SETTING_KEYS = [
  "learnMoreEnabled",
  "learnMoreStudentTitle",
  "learnMoreStudentContent",
  "learnMoreAdminTitle",
  "learnMoreAdminContent",
] as const;
