# GEMA TRANS ERP — Multi-Tenant Cargo & Expedition Management

Sistem ERP operasional ekspedisi dan kargo berbasis **Next.js 15 (App Router)** dan **Supabase (PostgreSQL, Auth, Row Level Security)**. Mendukung arsitektur multi-tenant *white-label* per perusahaan ekspedisi, manajemen STT (resi), manifest muatan kapal, penagihan invoice member (TOP), serta kontrol akses berbasis role & Google Authenticator (2FA).

---

## Fitur Utama

- **Multi-Tenant White-Label:** Kelola banyak entitas ekspedisi beserta upload logo, rekening bank, prefix nomor STT, dan tema warna brand masing-masing (otomatis diterapkan ke UI dan dokumen cetak).
- **Manajemen Resi (STT):**
  - Nomor STT otomatis per tenant (`{PREFIX}-{NOMOR}-{DD-MM-YYYY}`).
  - Input detail pengirim, penerima, tanggal booking & pickup, member searchable, kota asal/tujuan dari master wilayah Indonesia, layanan (`Reguler`, `Express`, `Charter`), via (`Laut`, `Darat`, `Udara`, `Container`), serta asuransi.
  - Input rincian koli massal (ukuran `P×L×T`, berat aktual, perhitungan otomatis KG vs Volumetrik vs CBM, dan duplikasi dimensi koli #1 ke semua baris).
  - Filter rentang tanggal, pencarian, serta **Soft Delete & Pulihkan (Sampah)**.
  - Cetak **STT (Surat Tanda Terima)** dan **Thermal Label dengan QR Code** per koli.
- **Daftar Muat (Manifest):** Pengelompokan STT ke manifest keberangkatan kapal/vendor, pembaruan status pengiriman, dan cetak daftar muat.
- **Invoice Penagihan & Piutang Member (TOP):** Pembuatan invoice per member dari resi belum tertagih, diskon, jatuh tempo otomatis berdasarkan TOP member, pencatatan pembayaran (`Unpaid` / `Partial` / `Paid`), dan cetak faktur.
- **Master Wilayah Indonesia (Database):** Tabel `regions` berisi 458 kota/kabupaten & provinsi yang dapat dikelola oleh Master Admin.
- **Keamanan & Autentikasi:**
  - Login dengan **Username atau Email** + Password.
  - **Google Authenticator (2FA / TOTP)** opsional per akun di menu Profil & 2FA (`/account`).
  - **RBAC Multi-Tenant:**
    - `master_admin`: Akses semua tenant, manajemen ekspedisi, user & role, master wilayah, serta pengaturan brand.
    - `finance`: Akses penuh Invoice (buat, diskon, catat bayar, cetak), STT, Manifest, dan Member di tenant-nya.
    - `marketing`: Akses STT, Manifest, Member, serta **Invoice mode lihat saja (*read-only*)** — diblokir di UI, Server Actions, dan RLS PostgreSQL dari membuat/mengubah/membayar invoice.
  - **Row Level Security (RLS)** aktif di seluruh tabel Supabase dengan isolasi antar tenant.

---

## Tech Stack

- **Framework:** Next.js `15.5` (React `19`, App Router, Server Actions)
- **Styling:** Tailwind CSS, Lucide Icons
- **Database & Auth:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Validasi & Utilitas:** TypeScript, Zod, QRCode
- **Testing:** Node Test Runner (`tsx --test`)

---

## Menjalankan di Lokal

### 1. Install Dependencies
```bash
npm install
```

### 2. Konfigurasi Environment Variables
Buat file `.env.local` di root project (file ini diabaikan oleh `.gitignore`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

> **Catatan keamanan:** `SUPABASE_SECRET_KEY` tidak memakai prefix `NEXT_PUBLIC_` dan hanya digunakan di sisi server (`src/lib/supabase/admin.ts`) untuk resolusi username saat login dan manajemen user oleh Master Admin.

### 3. Jalankan Migrasi SQL di Supabase
Salin dan jalankan skrip [`supabase/migrations/20261111_auth_rbac_regions_rls.sql`](supabase/migrations/20261111_auth_rbac_regions_rls.sql) di **Supabase → SQL Editor** untuk membuat tabel `profiles`, `company_memberships`, `regions` (beserta seed 458 wilayah Indonesia), fungsi helper keamanan, dan seluruh policy RLS.

### 4. Jalankan Development Server
```bash
npm run dev
```

Aplikasi berjalan di [http://localhost:4000](http://localhost:4000). Pada setup awal saat belum ada `master_admin`, buka `/setup` untuk membuat akun **Master Admin** pertama.

---

## Perintah Penting

```bash
npm run dev     # Menjalankan server development (port 4000)
npm run build   # Production build Next.js
npm run start   # Menjalankan hasil build produksi (port 4000)
npm test        # Menjalankan unit test keamanan, RBAC & kalkulasi
```

---

## Struktur Direktori Utama

- `src/app/` — Halaman App Router (`login`, `setup`, `account`, `shipments`, `manifests`, `invoices`, `members`, `admin/*`, `settings`) dan Server Actions (`src/app/actions/`).
- `src/components/` — Komponen UI per modul (`auth`, `shipments`, `manifests`, `invoices`, `members`, `admin`, `layout`, `ui`).
- `src/lib/` — Helper autentikasi & context tenant (`auth.ts`, `company-context.ts`), aturan validasi/RBAC (`security-rules.ts`), sanitasi error & kalkulasi (`utils.ts`), dan Supabase clients (`supabase/`).
- `src/middleware.ts` — Proteksi sesi route dan verifikasi MFA (`aal1` → `aal2`).
- `supabase/migrations/` — Skrip SQL migrasi schema, seed wilayah, dan RLS.

---

## Deploy ke Vercel

1. Import repository GitHub ini ke **Vercel**.
2. Tambahkan 3 Environment Variables di **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SECRET_KEY`
3. Deploy. Setelah domain aktif, tambahkan URL domain Vercel ke **Supabase → Authentication → URL Configuration** (`Site URL` & `Redirect URLs`).
