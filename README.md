# Attendx · Sistem Kehadiran Murid SMK Rantau Panjang

Web app kehadiran murid yang dibuka macam app telefon. Guru log masuk, pilih kelas dan tarikh, tanda kehadiran, dan simpan. Data disimpan dalam **Supabase**, dan app dihoskan secara percuma di **GitHub Pages**.

## Kandungan folder

| Fail / folder | Fungsi |
|---|---|
| `index.html` | Halaman utama app |
| `css/style.css` | Rupa dan warna app |
| `js/config.js` | **Satu-satunya fail yang cikgu perlu ubah** (URL dan kunci Supabase) |
| `js/data.js`, `js/app.js` | Logik app (tak perlu diubah) |
| `supabase/01_struktur.sql` | Cipta jadual dalam Supabase |
| `supabase/02_data_dummy.sql` | Isi 50 kelas, murid dan rekod kehadiran contoh |
| `icons/`, `manifest.webmanifest`, `sw.js` | Supaya app boleh dipasang di skrin utama telefon |

---

## BAHAGIAN A · Supabase (pangkalan data)

### A1. Cipta projek
1. Pergi ke **supabase.com** dan tekan **Start your project**. Log masuk dengan akaun GitHub (paling mudah).
2. Tekan **New project**.
3. Isi:
   - **Name**: `attendx`
   - **Database Password**: tekan *Generate a password* dan **simpan kata laluan ini** di tempat selamat.
   - **Region**: pilih **Southeast Asia (Singapore)** supaya laju.
4. Tekan **Create new project** dan tunggu 1–2 minit sehingga siap.

### A2. Cipta jadual
1. Menu kiri: **SQL Editor** › **New query**.
2. Buka fail `supabase/01_struktur.sql`, salin **semua** isinya, tampal dalam editor.
3. Tekan **Run**. Mesti keluar *Success. No rows returned*.

### A3. Masukkan data dummy
1. Tekan **New query** sekali lagi.
2. Salin semua isi `supabase/02_data_dummy.sql`, tampal, tekan **Run**.
3. Di bahagian bawah akan keluar satu baris seperti: `bil_kelas 50 | bil_murid ±1700 | bil_rekod_kehadiran ±52000`.
4. Nak tengok data? Menu kiri **Table Editor** › pilih `kelas`, `murid` atau `kehadiran`.

> Jika keluar amaran "destructive operation", tekan **Run this query**. Ia cuma kerana fail ini mengosongkan jadual sebelum isi data baharu.

### A4. Cipta akaun log masuk (1 akaun)
1. Menu kiri: **Authentication** › **Users** › **Add user** › **Create new user**.
2. Isi email (contoh `admin@smkrp.edu.my`) dan kata laluan.
3. Pastikan **Auto Confirm User** ditanda. Tekan **Create user**.

### A5. Tutup pendaftaran awam (penting)
Supaya orang luar tak boleh daftar akaun sendiri:
1. **Authentication** › **Sign In / Providers** (atau **Providers**).
2. Matikan **Allow new users to sign up**. Tekan **Save**.

### A6. Ambil URL dan kunci
1. Tekan butang **Connect** di bahagian atas dashboard (atau **Project Settings** › **API Keys**).
2. Salin dua perkara:
   - **Project URL**: contoh `https://abcdefghijkl.supabase.co`
   - **Publishable key**: bermula dengan `sb_publishable_...` (projek lama: *anon public key* yang bermula dengan `eyJ...`)
3. Buka `js/config.js` dan tampal:

```js
SUPABASE_URL: 'https://abcdefghijkl.supabase.co',
SUPABASE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxx',
```

> Kunci *publishable/anon* memang direka untuk diletak dalam app; data tetap dilindungi kerana hanya pengguna yang log masuk boleh baca dan tulis. **Jangan sekali-kali letak *secret key* atau *service_role key*.**

---

## BAHAGIAN B · GitHub (letak app di internet)

### B1. Cipta repository
1. Log masuk **github.com** › tekan **+** (atas kanan) › **New repository**.
2. **Repository name**: `attendx`
3. Pilih **Public** (GitHub Pages percuma perlukan repo awam. Data murid tetap selamat dalam Supabase, bukan dalam GitHub).
4. Tekan **Create repository**.

### B2. Muat naik fail
1. Dalam repo baharu, tekan pautan **uploading an existing file** (atau **Add file** › **Upload files**).
2. Buka folder `attendx` di komputer, pilih **semua isi di dalamnya** (`index.html`, `css`, `js`, `icons`, `supabase`, dan lain-lain) dan seret ke halaman GitHub.
   - Seret **isi** folder, bukan folder `attendx` itu sendiri. `index.html` mesti berada di tingkat paling atas repo.
   - Fail `.nojekyll` mungkin tersembunyi di komputer; tak apa jika tertinggal.
3. Tekan **Commit changes**.

### B3. Hidupkan GitHub Pages
1. Dalam repo, tekan **Settings** › menu kiri **Pages**.
2. Di bawah **Build and deployment** › **Source**, pilih **Deploy from a branch**.
3. **Branch**: pilih `main` dan folder `/ (root)`. Tekan **Save**.
4. Tunggu 1–3 minit, kemudian muat semula halaman. Alamat app akan keluar di atas, contohnya:
   `https://namaakaun.github.io/attendx/`

### B4. Cuba di telefon
1. Buka alamat tadi di telefon dan log masuk dengan akaun di A4.
2. Pasang ke skrin utama:
   - **Android (Chrome)**: menu ⋮ › **Tambah ke skrin utama**
   - **iPhone (Safari)**: butang Kongsi › **Add to Home Screen**

---

## Mengemas kini app selepas ini
Bila ada fail baharu (contohnya `js/app.js` yang dikemas kini):
1. Buka repo di GitHub › **Add file** › **Upload files**.
2. Seret fail baharu (dalam folder yang betul, contohnya masuk ke folder `js` dahulu).
3. **Commit changes**. App akan dikemas kini dalam 1–3 minit. Di telefon, tutup dan buka semula app.

## Tukar ke data sebenar nanti
- Padam data dummy: jalankan `truncate kehadiran, murid restart identity;` dalam SQL Editor (kelas 1A–5J kekal).
- Masukkan murid sebenar melalui **Table Editor** › `murid` › **Insert** › **Import data from CSV** (lajur: `kelas_id`, `nama`, `jantina`).

## Mod demo
Jika `js/config.js` dibiarkan kosong, app berjalan dalam **mod demo**: data rekaan dijana dalam browser dan apa-apa email/kata laluan boleh digunakan. Sesuai untuk cuba app sebelum Supabase siap.

## Peraturan app
- Status: **H** Hadir, **T** Tidak hadir, **L** Lewat, **C** Cuti.
- Sebab (hanya untuk Tidak hadir): Sakit, Ponteng, Pengangkutan, Lain-lain (dengan catatan).
- Hari sekolah: Ahad–Khamis. Jumaat dan Sabtu tidak boleh dipilih. Tarikh akan datang tidak boleh dipilih.
- Peratus kehadiran = (Hadir + Lewat) ÷ jumlah hari direkod.
- Amaran: murid yang Tidak hadir pada 3 rekod terakhir berturut-turut.
