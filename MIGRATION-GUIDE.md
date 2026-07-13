# Panduan Migrasi Database ke Supabase

## Status Migrasi

✅ **Konfigurasi Sudah Selesai**
- File `.env` sudah dikonfigurasi dengan kredensial Supabase
- Prisma schema sudah dikonfigurasi untuk PostgreSQL/Supabase
- Migration SQL sudah tersedia di `prisma/migrations/20260711140936_init_supabase/`

✅ **Script Migrasi Sudah Dibuat**
- `prisma/migrate-from-sqlite.ts` - Script untuk transfer data dari SQLite ke Supabase
- `prisma/verify-migration.ts` - Script untuk verifikasi hasil migrasi
- `prisma/quick-check.ts` - Script quick check status database

## Cara Verifikasi Migrasi

### Opsi 1: Menggunakan Script Verifikasi

```bash
# Generate Prisma Client terlebih dahulu (jika belum)
npm run db:generate

# Jalankan script verifikasi
node node_modules/tsx/dist/cli.mjs prisma/verify-migration.ts
```

atau

```bash
node node_modules/tsx/dist/cli.mjs prisma/quick-check.ts
```

### Opsi 2: Menggunakan Supabase Dashboard

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik **Table Editor** di sidebar kiri
4. Cek apakah tabel-tabel berikut sudah ada dan berisi data:
   - User
   - Survey
   - Question
   - Response
   - Answer
   - Counseling
   - Setting
   - VisitorLog

### Opsi 3: Menggunakan SQL Editor di Supabase

1. Buka Supabase Dashboard > SQL Editor
2. Jalankan query berikut untuk cek jumlah data:

```sql
SELECT 
  (SELECT COUNT(*) FROM "User") as users,
  (SELECT COUNT(*) FROM "Survey") as surveys,
  (SELECT COUNT(*) FROM "Question") as questions,
  (SELECT COUNT(*) FROM "Response") as responses,
  (SELECT COUNT(*) FROM "Answer") as answers,
  (SELECT COUNT(*) FROM "Counseling") as counseling,
  (SELECT COUNT(*) FROM "Setting") as settings,
  (SELECT COUNT(*) FROM "VisitorLog") as visitor_logs;
```

## Cara Menjalankan Ulang Migrasi (Jika Diperlukan)

Jika migrasi belum berhasil atau perlu dijalankan ulang:

```bash
# 1. Generate Prisma Client
npm run db:generate

# 2. Deploy migration ke Supabase (jika belum)
npm run db:migrate

# 3. Jalankan script migrasi data
node node_modules/tsx/dist/cli.mjs prisma/migrate-from-sqlite.ts
```

## Struktur Data yang Dimigrasikan

Script migrasi akan mentransfer data dalam urutan berikut (untuk menjaga integritas foreign key):

1. **User** - Data pengguna (siswa dan admin)
2. **Survey** - Data survey/kuesioner
3. **Setting** - Pengaturan aplikasi
4. **Question** - Pertanyaan survey (depends on Survey)
5. **Response** - Respon survey dari user (depends on User & Survey)
6. **Answer** - Jawaban individual (depends on Response & Question)
7. **Counseling** - Data konseling (depends on User)
8. **VisitorLog** - Log kunjungan user (depends on User)

## Troubleshooting

### Error: EPERM operation not permitted

Jika mendapat error permission saat generate Prisma Client:
1. Tutup semua terminal/proses yang menggunakan database
2. Restart VS Code
3. Coba generate ulang: `npm run db:generate`

### Script migrasi berjalan lama

Script migrasi menggunakan `upsert` untuk setiap record, sehingga aman untuk dijalankan berulang kali. Jika data banyak, proses bisa memakan waktu beberapa menit.

### Koneksi ke Supabase gagal

1. Pastikan kredensial di `.env` sudah benar
2. Cek apakah project Supabase masih aktif
3. Pastikan IP Anda tidak diblokir (cek Supabase Dashboard > Settings > Database)

## Catatan Penting

- ✅ Data dari `custom.db` akan di-copy ke Supabase (tidak akan dihapus dari SQLite)
- ✅ Script menggunakan `upsert`, jadi aman dijalankan berulang kali
- ✅ Timestamp dan ID akan dipertahankan dari database asli
- ✅ Relasi antar tabel akan tetap terjaga

## Next Steps

Setelah migrasi berhasil:

1. **Update aplikasi** untuk menggunakan Supabase sebagai database utama
2. **Hapus file database lokal** `custom.db` (setelah verifikasi data lengkap)
3. **Update .gitignore** jika ada file database yang perlu diabaikan
4. **Testing** aplikasi untuk memastikan semua fitur berjalan normal dengan Supabase

## Kontak

Jika ada masalah atau pertanyaan tentang migrasi, silakan hubungi tim development atau cek dokumentasi Supabase di https://supabase.com/docs
