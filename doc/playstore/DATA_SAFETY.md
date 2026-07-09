# Data Safety — Sagansa Attendance

Panduan pengisian **Play Console → App content → Data safety**.
Berdasarkan permission & penggunaan API aktual di kode (per 2026-07-09).

---

## Ringkasan jawaban utama

- **Apakah app mengumpulkan atau membagikan data pengguna?** → **Yes**
- **Apakah semua data dikumpulkan dienkripsi saat transit?** → **Yes** (HTTPS ke `https://api-mobile.sagansa.id`)
- **Apakah user bisa meminta penghapusan data?** → **Yes** (via admin perusahaan / support@sagansa.id) — _konfirmasi kebijakan riil_
- **Apakah data dibagikan ke pihak ketiga?** → **No** (kecuali: _konfirmasi jika ada analytics/crash reporting_)

---

## Tabel jenis data yang dikumpulkan

Isi tabel ini persis di form Play Console. Setiap baris = satu kategori data.

| # | Kategori data | Jenis spesifik | Tujuan | Wajib / Opsional | Dibagikan? | Dihapus on-request? |
|---|---|---|---|---|---|---|
| 1 | **Location** | Approximate location (coarse) | App functionality (absensi/geofencing) | Required | No | Yes |
| 2 | **Location** | Precise location (fine) | App functionality (absensi/geofencing) | Required | No | Yes |
| 3 | **Photos and videos** | Photos (bukti foto absensi) | App functionality (verifikasi kehadiran) | Optional | No | Yes |
| 4 | **Personal info** | Email address | Account management, identification | Required | No | Yes |
| 5 | **Personal info** | Name | Identification, absensi | Required | No | Yes |
| 6 | **Account** | Account credentials (token) | Authentication | Required | No | Yes |

### Catatan per item

1. **Location** — dikumpulkan **hanya saat app terbuka / saat clock-in-out** (foreground). TIDAK ada background location. Permission: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`. Sumber kode: `app/(tabs)/index.tsx`, `components/CheckInOutModal.tsx` (`Location.getCurrentPositionAsync`).
2. **Photos** — `expo-image-picker` (`launchCameraAsync`, `cameraType: front`) untuk bukti foto. Hanya dikirim ke server saat user submit absensi dengan foto. Opsional (tergantung kebijakan tenant).
3. **Email & Name** — dari akun karyawan (login multi-tenant). Diperlukan untuk identifikasi absensi.
4. **Credentials** — JWT/token disimpan di AsyncStorage. Tidak dibagikan ke pihak ketiga.

---

## Permission yang dideklarasikan (di AndroidManifest via app.json)

```
android.permission.ACCESS_COARSE_LOCATION
android.permission.ACCESS_FINE_LOCATION
android.permission.CAMERA
```

Diblokir secara eksplisit (tidak akan ikut):
```
android.permission.RECORD_AUDIO
android.permission.READ_EXTERNAL_STORAGE
android.permission.WRITE_EXTERNAL_STORAGE
```

---

## Hal yang HARUS dikonfirmasi sebelum submit

- [ ] **Crash reporting / analytics?** Jika pakai Sentry/Firebase Analytics/Sentry, wajib dideklarasikan di Data Safety. _Saat ini tidak ada di dependencies (periksa ulang saat rilis)._
- [ ] **Kebijakan retensi data** di server sagansa — berapa lama data absensi disimpan?
- [ ] **Mekanisme permintaan hapus data** (GDPR/UU PDP) — siapa kontak & SLA-nya?

---

## Pencegahan penolakan Play Store

- **Jangan klaim "tidak mengumpulkan data"** karena jelas ada lokasi + foto + akun.
- **"Encrypted in transit"** harus benar — API pakai `https://` (sudah, lihat `app.json` extra.apiUrl). Pastikan tidak ada fallback `http://`.
- **"Data can be deleted"** harus ada mekanisme nyata; sediakan kontak/email hapus akun.
