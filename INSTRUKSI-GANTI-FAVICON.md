# Instruksi Mengganti Favicon/Icon Website

## Status Saat Ini ✅

Logo sekolah **SUDAH TERSIMPAN** di database dengan sukses!
- 📊 Ukuran data: 330,598 karakter (base64)
- 🎯 Key: `schoolLogo`
- ✅ Format: PNG (data:image/png;base64)

## Kenapa Masih Muncul Icon "Z"?

Icon "Z" masih muncul karena **browser cache**. Browser menyimpan favicon dalam cache yang sangat persistent dan tidak mudah di-refresh.

## Solusi: Cara Melihat Logo Sekolah yang Baru

### Opsi 1: Hard Refresh Browser (PALING MUDAH) ⭐

1. **Restart development server** terlebih dahulu:
   ```bash
   # Stop server (Ctrl+C)
   # Kemudian start lagi:
   npm run dev
   ```

2. **Hard refresh** di browser dengan salah satu cara:
   - **Chrome/Edge**: `Ctrl + Shift + R` atau `Ctrl + F5`
   - **Firefox**: `Ctrl + Shift + R` atau `Ctrl + F5`
   - **Mac**: `Cmd + Shift + R`

3. Jika masih belum berubah, **clear cache secara manual**:
   - Chrome: `Ctrl + Shift + Delete` → Pilih "Cached images and files" → Clear data
   - Edge: `Ctrl + Shift + Delete` → Pilih "Cached images and files" → Clear now

### Opsi 2: Test di Incognito/Private Mode

Buka website di **Incognito/Private browsing mode**:
- Chrome/Edge: `Ctrl + Shift + N`
- Firefox: `Ctrl + Shift + P`

Di mode ini tidak ada cache, jadi logo sekolah akan langsung terlihat! ✨

### Opsi 3: Test di Browser Berbeda

Buka website di browser yang belum pernah membuka website ini (misalnya jika biasa pakai Chrome, coba buka di Firefox atau Edge).

## Cara Kerja Sistem Favicon

Website ini menggunakan **dynamic favicon** yang otomatis mengambil logo dari database:

1. **Database** → Logo sekolah tersimpan di tabel `Setting` dengan key `schoolLogo`
2. **API** → Endpoint `/api/pwa/favicon` generate favicon 32x32px dari logo sekolah
3. **Browser** → Menampilkan favicon dengan background gradient teal-green

File yang terlibat:
- `src/app/api/pwa/favicon/route.ts` - API generator favicon
- `src/app/layout.tsx` - Konfigurasi metadata favicon
- Database Setting (`schoolLogo`) - Sumber logo sekolah

## Verifikasi Logo Sudah Benar

Setelah restart server dan clear cache, logo yang muncul seharusnya:
- ✅ Bukan lagi huruf "Z"
- ✅ Menampilkan logo sekolah yang ada di `public/school-illustration.png`
- ✅ Dengan background gradient teal-green
- ✅ Ukuran 32x32 pixel di tab browser

## Jika Masih Bermasalah

Jalankan script berikut untuk memverifikasi logo:
```bash
node check-school-logo.js
```

Output yang benar:
```
✅ School logo already exists in database!
📊 Logo data size: 330598 characters
```

## Update: Logo Fallback

File `logo.svg` akan diupdate sebagai fallback jika API tidak dapat diakses.

---

**Catatan**: Favicon adalah salah satu file yang paling sering di-cache oleh browser. Sangat normal jika perlu hard refresh atau clear cache untuk melihat perubahan.
