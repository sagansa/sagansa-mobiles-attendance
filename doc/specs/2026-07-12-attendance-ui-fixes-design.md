# Sagansa Attendance — UI Fixes (6 Tasks)

**Tanggal:** 2026-07-12
**Lokasi:** `mobiles/attendance/`
**Stack:** Expo SDK 57, React Native 0.86, expo-router, `react-native-safe-area-context` 5.7

## Ringkasan

Enam perbaikan UI/UX pada aplikasi absensi `mobiles/attendance`:

1. Terapkan SafeArea atas pada seluruh layar yang belum memakainya.
2. Perbaiki input password (warna teks hitam + tombol show/hide) — juga di register.
3. Onboarding screen yang meminta izin native (GPS, kamera, galeri) saat first open, sebelum login.
4. Refactor seluruh modal untuk memakai komponen `BaseModal` reusable.
5. Perbaiki layar `leave-request`: kalender center, tombol submit jadi sticky footer di luar ScrollView, dukung keyboard.
6. Konsistenkan seluruh aset icon & splash ke desain **pin biru (logo.jpg)**; buang `icon.svg` monogram-S yang menyesatkan.

## Konteks & Temuan Awal

- **SafeAreaProvider sudah disediakan** oleh expo-router di root navigator → `useSafeAreaInsets()` langsung pakai tanpa wrapper.
- Hanya `app/leave-request.tsx` yang memakai `useSafeAreaInsets()`. Lima layar lain memakai padding statis.
- Input password (`login.tsx`, `register.tsx`) tidak set `color` eksplisit dan tidak punya toggle visibility.
- Tiga modal saat ini masing-masing membangun `<Modal>` RN sendiri dari nol: `ConfirmDialog`, `UserMenu`, `CheckInOutModal` (termasuk nested store-picker modal).
- `leave-request.tsx` memakai `ScrollView` polos tanpa `KeyboardAvoidingView`; tombol submit berada jauh di dalam scroll dan sering tidak terlihat.
- Inkonsistensi aset: `icon.svg` adalah monogram-S maroon/emas, sedangkan `logo.svg`/`logo.jpg` (sumber PNG) adalah pin biru + jam + centang. PNG di-generate dari `logo.jpg` via `scripts/generate-icons.py` (Pillow + numpy — tersedia 11.3 / 2.0).

---

## Task #1 — SafeArea Atas

### Tujuan
Konten/header tidak tertumpuk dengan status bar / notch di perangkat dengan inset atas.

### Perubahan
Tambah `useSafeAreaInsets()` dan terapkan `paddingTop: insets.top` (atau ekivalen) pada elemen paling atas:

| File | Lokasi penerapan |
|------|------------------|
| `app/(auth)/login.tsx` | `content` ScrollView (Tambahkan `paddingTop: insets.top`) |
| `app/(tabs)/index.tsx` | container `header` |
| `app/(tabs)/history.tsx` | `headerContainer` |
| `app/(tabs)/leave.tsx` | `header` |
| `app/profile.tsx` | `container` |
| `app/leave-request.tsx` | sudah memakai insets — tidak diubah |

Catatan: Auth flow (`(auth)/_layout.tsx`, `(tabs)/_layout.tsx`) tidak diubah karena hanya guard/redirect, tidak merender UI yang memerlukan padding atas.

---

## Task #2 — Password Input (hitam + tombol mata)

### Tujuan
Titik/teks password tetap hitam di light mode, dan pengguna bisa melihat/menyembunyikan password.

### Komponen Baru: `components/PasswordInput.tsx`

Input teks reusable yang:

- Memaksa `color: '#111827'` (hitam) eksplisit pada teks.
- `secureTextEntry` di-toggle oleh state lokal `isSecure`.
- Tombol mata di sisi kanan: `MaterialIcons` `visibility` (saat tersembunyi) / `visibility-off` (saat tampil).
- Mewarisi styling input eksisting (border `#E5E7EB`, radius 12, padding `16/14`, font 16) supaya konsisten dengan field email.
- Menerima seluruh props `TextInput` lewat spread (`autoCapitalize`, `placeholder`, `onChangeText`, `value`, dll).

```tsx
type PasswordInputProps = TextInputProps & {
  // Tidak ada tambahan; komponen mengelola state secureTextEntry sendiri.
};
```

### Penerapan
- `app/(auth)/login.tsx`: ganti `<TextInput secureTextEntry />` field password → `<PasswordInput />`.
- `app/(auth)/register.tsx`: ganti field `password` dan `password_confirmation` → `<PasswordInput />`.

---

## Task #3 — Onboarding Permission Screen

### Tujuan
Saat pertama kali dibuka (sebelum login), app menjelaskan & meminta izin yang dibutuhkan (GPS, kamera, galeri).

### Routing & Guard

- Rute baru standalone: `app/onboarding.tsx` (di luar grup `(auth)`/`(tabs)`).
- Daftarkan di root `app/_layout.tsx`:
  ```tsx
  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
  ```
- Guard di `app/(auth)/_layout.tsx`: saat `!isAuthenticated && !onboardingDone` → `<Redirect href="/onboarding" />`. `onboardingDone` dibaca dari AsyncStorage key `@presence/onboarding-done` (initial state, lalu reaktiv lewat `useSafeState`/effect sederhana).

### Status Persistensi
- AsyncStorage key: `@presence/onboarding-done` (`'1'` setelah selesai).
- Hook kecil `useOnboardingStatus()` membaca flag saat bootstrap; expose `{ isOnboardingDone, markOnboardingDone }`.

### Konten Layar (`app/onboarding.tsx`)

- Latar putih (`#F9FAFB`), SafeArea atas.
- Header: `Logo` + judul "Selamat Datang" + subjudul "Sebelum mulai, aktifkan izin berikut."
- Tiga kartu penjelas (ikon MaterialIcons + judul + deskripsi):
  1. **Lokasi GPS** (`location-on`) — "Memverifikasi kehadiran Anda saat clock-in/out."
  2. **Kamera** (`photo-camera`) — "Mengambil selfie bukti kehadiran."
  3. **Galeri Foto** (`photo-library`) — "Memilih foto bukti dari galeri."
- Dua tombol:
  - **"Izinkan Sekarang"** (primer) → trigger native dialog berurutan:
    1. `Location.requestForegroundPermissionsAsync()`
    2. `ImagePicker.requestCameraPermissionsAsync()`
    3. `ImagePicker.requestMediaLibraryPermissionsAsync()`
    Hasil tiap permintaan diabaikan (tidak memblokir); setelah selesai → `markOnboardingDone()` + `router.replace('/(auth)/login')`.
  - **"Lewati"** (sekunder) → langsung `markOnboardingDone()` + redirect login. Izin tetap akan diminta on-demand saat dibutuhkan (pola existing di Home/CheckInOutModal tetap utuh).

### Catatan
- Tidak ada perubahan pada plugin `expo-location` / `expo-image-picker` (sudah terkonfigurasi di `app.json`).
- Guard onboarding dievaluasi **setelah** `isBootstrapping` (guard auth eksisting) supaya tidak flash.

---

## Task #4 — Modal Refactoring (semua modal)

### Tujuan
Satu komponen modal dasar reusable; eliminasi duplikasi overlay/backdrop/animasi di 3 modal.

### Komponen Baru: `components/ui/BaseModal.tsx`

```ts
type BaseModalVariant = 'center' | 'top-right' | 'full-screen';

type BaseModalProps = {
  visible: boolean;
  onClose?: () => void;
  animationType?: 'none' | 'slide' | 'fade';   // default 'fade'
  variant?: BaseModalVariant;                   // default 'center'
  overlayColor?: string;                        // default 'rgba(17,24,39,0.4)'
  dismissOnBackdrop?: boolean;                  // default true
  children: React.ReactNode;
};
```

Tanggung jawab BaseModal:
- Render `<Modal>` RN (`transparent`, `animationType`, `visible`, `onRequestClose`).
- Overlay (flex:1 + warna) + `<Pressable>` backdrop absolut untuk menutup bila `dismissOnBackdrop`.
- Penempatan konten sesuai `variant`:
  - `center` → `justifyContent: 'center'` + `alignItems: 'center'` + `padding: 24`.
  - `top-right` → `justifyContent: 'flex-start'` + `alignItems: 'flex-end'` + padding memakai `useSafeAreaInsets()` atas.
  - `full-screen` → tanpa padding, anak mengisi layar.
- `onClose` dipanggil saat backdrop ditekan atau hardware back (jika `dismissOnBackdrop` true).

### Refactor Konsumen

| Komponen | BaseModal props | Anak |
|----------|-----------------|------|
| `ConfirmDialog` | `animationType="fade"` `variant="center"` `dismissOnBackdrop` | card (iconBadge + title + message + actions) |
| `UserMenu` | `animationType="fade"` `variant="top-right"` `dismissOnBackdrop` | menu card (userName/email + items) |
| `CheckInOutModal` (luar) | `animationType="slide"` `variant="center"` `dismissOnBackdrop={false}` | container (heading + ScrollView + footer) |
| `CheckInOutModal` store-picker (nested) | `animationType="slide"` `variant="full-screen"` `dismissOnBackdrop={false}` | store list screen |

API publik tiap komponen konsumen **tidak berubah** (props lama dipertahankan); hanya implementasi internal yang diganti memakai `BaseModal`. Behavioral parity: animasi, warna overlay, posisi, dan dismiss tetap sama seperti sebelumnya.

---

## Task #5 — leave-request: Kalender Center + Tombol Terlihat

### Tujuan
Kalender tampil center; tombol submit selalu terlihat; layar tidak rusak saat keyboard aktif.

### Masalah Saat Ini
- `ScrollView` polos → saat field "Alasan" difokus, konten naik & tombol submit di bawah tersembunyi.
- Tidak ada pembungkus keyboard; kalender tidak eksplisit center.
- Tombol submit berada di akhir konten scroll → mudah tak terlihat.

### Solusi

Restruktur layout `app/leave-request.tsx` jadi tiga zona vertikal:

```
<View container flex:1>
  ├─ <Header>              (back + title, paddingTop: insets.top)   ← tetap
  ├─ <KeyboardAvoidingView flex:1 behavior="padding" iOS>
  │    └─ <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
  │         ├─ Tipe Cuti
  │         ├─ Pilih Tanggal  (calendarContainer: alignSelf:'center', width:'100%')
  │         └─ Alasan (TextInput multiline)
  │       </ScrollView>
  │  </KeyboardAvoidingView>
  └─ <Footer>              (sticky, di luar ScrollView)             ← DIPINDAHKAN
       └─ <TouchableOpacity submitButton>
```

Detail:
- **Tombol submit dipindah keluar ScrollView** menjadi **sticky footer** (pola konsisten dengan `CheckInOutModal` footer). Selalu terlihat.
- **`KeyboardAvoidingView`** (`behavior="padding"` di iOS, `undefined` di Android) membungkus ScrollView agar field "Alasan" tidak tertutup keyboard.
- **Kalender**: `calendarContainer` diberi `alignSelf: 'center'` + `width: '100%'`; `daysGrid` tetap flex-wrap. Header kalender (prev/next + bulan) sudah center secara default.
- `keyboardShouldPersistTaps="handled"` pada ScrollView.
- Footer punya border atas + padding bawah `insets.bottom + 12` agar tidak tertabrak home indicator.

---

## Task #6 — Konsistenkan Icon & Splash ke Pin Biru (logo.jpg)

### Tujuan
Seluruh aset icon & splash memakai desain **pin biru + jam + centang** (sumber `logo.jpg`/`logo.svg`). Buang referensi monogram-S yang inkonsisten.

### Sumber Kebenaran
- `assets/images/logo.jpg` (raster asli) → sumber PNG via `scripts/generate-icons.py`.
- `assets/images/src-svg/logo.svg` (vektor pin biru) → sumber vektor bersih.

### Langkah

1. **Tulis ulang SVG sumber agar selaras dengan pin biru** (saat ini `icon.svg` dll. memakai desain maroon/emas yang salah):
   - `assets/images/src-svg/icon.svg` → pin biru pada latar putih (rounded-square optional), 1024×1024.
   - `assets/images/src-svg/adaptive-icon-fg.svg` → emblem pin biru saja (untuk foreground adaptive icon, di safe-zone tengah).
   - `assets/images/src-svg/splash-icon.svg` → emblem pin biru transparan (di atas bg splash putih).
   - `assets/images/src-svg/favicon.svg` → emblem pin biru pada latar putih, 48×48.
   - `assets/images/src-svg/playstore-icon.svg` → emblem pin biru, 512×512.
   - `logo.svg` tidak diubah (sudah benar).
2. **Regenerasi PNG** dengan menjalankan ulang `scripts/generate-icons.py` (Pillow 11.3 + numpy 2.0 tersedia). Aset yang di-overwrite:
   - `assets/images/logo.png` (master transparan)
   - `assets/images/icon.png` (1024)
   - `assets/images/adaptive-icon.png` (1024)
   - `assets/images/splash-icon.png` (200, transparan)
   - `assets/images/favicon.png` (48)
   - `assets/store/playstore-icon.png` (512)
   - `assets/store/feature-graphic.png` (1024×500)
3. **Verifikasi `app.json`** — tidak ada perubahan yang diperlukan (splash `splash-icon.png` bg putih, adaptive-icon bg `#FFFFFF` cocok dengan emblem biru). Validasi path & nama file tetap sesuai.
4. **Verifikasi visual** setelah regenerasi (buka PNG, pastikan emblem biru terlihat di semua aset).

### Catatan
- `scripts/generate-icons.py` tidak diubah logikanya — sumber `logo.jpg` dan pipeline tetap; yang berubah hanya output PNG di-regenerasi dan SVG sumber diselaraskan untuk dokumentasi vektor.
- Icon dalam-app (`Logo.tsx`) sudah memakai `logo.png` → tidak ada perubahan.

---

## Urutan Implementasi (Rekomendasi)

1. **Task #6** (icon regenerasi) — independen, tidak mengandalkan task lain.
2. **Task #1** (SafeArea) — cepat, fondasi layout.
3. **Task #2** (PasswordInput) — komponen baru + integrasi login/register.
4. **Task #5** (leave-request layout) — perbaikan fokus.
5. **Task #4** (BaseModal + refactor) — terbesar; sentuh ConfirmDialog/UserMenu/CheckInOutModal.
6. **Task #3** (onboarding) — layar baru + guard; paling menyentuh routing.

## Out of Scope

- Dark mode (app sudah `automatic` tapi task ini fokus light mode; perubahan tidak boleh merusak dark).
- Refactor hook/data (`useAuth`, `useAttendance`, `lib/api`).
- Perubahan API backend atau plugin Expo.
- Penambahan library modal eksternal (tetap memakai `<Modal>` RN via BaseModal).
- Tes otomatis (app tidak punya test harness).

## Risiko

- **Task #4**: refactor `CheckInOutModal` berisiko karena file besar (~800 baris) dengan banyak state. Mitigasi: pertahankan API publik, ganti hanya wrapper `<Modal>`, uji manual flow check-in/check-out.
- **Task #3**: guard onboarding bisa conflict dengan guard tenant eksisting. Mitigasi: evaluasi onboarding **setelah** `isBootstrapping`, sebelum cek auth.
- **Task #6**: `generate-icons.py` bisa gagal bila `logo.jpg` hilang/rusak. Mitigasi: verifikasi sumber ada sebelum menjalankan.
