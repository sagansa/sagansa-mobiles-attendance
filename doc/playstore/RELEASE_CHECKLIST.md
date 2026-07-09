# Release Checklist — Sagansa Attendance → Google Play Store

Urutan langkah submit ke Play Console. Centang saat selesai.

---

## A. Pra-submit (sudah disiapkan di repo ini)

- [x] `app.json` final: `name`, `android.package = id.sagansa.attendance`, `versionCode`, `permissions`
- [x] Plugin lokalisasi nama app (`plugins/withAndroidAppName.js`) → `values-id`/`values-in`
- [x] Aset branding tema Lokal Indonesia (`assets/images/*`, `assets/store/playstore-icon.png`)
- [x] `eas.json` profile `production` (AAB) + `preview` (APK) + `development`
- [x] `.gitignore` mengeksklud secret & build artifact
- [x] Dokumen: `LISTING.md`, `DATA_SAFETY.md`, `PRIVACY_POLICY.md`, `RELEASE_CHECKLIST.md`

## B. Verifikasi sebelum build

- [ ] Jalankan `npx expo prebuild --platform android` (opsional, untuk validasi plugin native) — hati-hati, akan membuat folder `android/`; jangan commit kecuali mau workflow bare
- [ ] Build APK preview & smoke-test install di device fisik / emulator
  ```bash
  eas build --platform android --profile preview
  # download APK, install, cek: nama launcher (ganti locale HP ke ID), permission prompt, clock-in/out, foto, cuti
  ```
- [ ] Verifikasi nama launcher: set locale HP Indonesia → harus muncul "Hadir by Sagansa"; locale English → "Sagansa Attendance"

## C. Build AAB production

- [ ] Login EAS: `eas login` (akun `dityoenggar`)
- [ ] Inisialisasi project EAS (jika pertama): `eas init` → catat **projectId**, isi ke `app.json` → `extra.eas.projectId`
- [ ] Atur kredensial: gunakan **EAS-managed keystore** (rekomendasi) saat prompt pertama build
- [ ] Build:
  ```bash
  eas build --platform android --profile production
  ```
- [ ] Catat: build number, commit SHA, link download `.aab`

## D. Play Console — setup app

- [ ] Buat aplikasi baru di [Play Console](https://play.google.com/console) → package `id.sagansa.attendance`
- [ ] **App content** (wajib sebelum release):
  - [ ] Privacy Policy URL (hosting `PRIVACY_POLICY.md` di URL publik)
  - [ ] Data safety form (ikuti `DATA_SAFETY.md`)
  - [ ] Ads: No
  - [ ] App access: sediakan akun demo jika login wajib (isi kredensial demo)
  - [ ] Content rating: isi IARC questionnaire → "Everyone"
  - [ ] Target audience: 18+
  - [ ] News app: No
  - [ ] Government apps: No
  - [ ] Financial features: No (atau sesuaikan)
  - [ ] Data deletion: sediakan jawaban mekanisme hapus akun/data
- [ ] **Store listing**:
  - [ ] Default (English): nama, deskripsi, ikon 512×512, screenshot min 2
  - [ ] Custom listing Indonesia: "Hadir by Sagansa" + deskripsi ID + screenshot ID (boleh sama)
  - [ ] Feature graphic 1024×500 (opsional tapi dianjurkan)

## E. Rilis bertahap (disarankan)

- [ ] Upload AAB ke track **Internal testing** → uji di akun tester
- [ ] Setelah OK → promote ke **Closed testing** (alpha/beta) → tim QA / sebagian user
- [ ] Setelah OK → **Production** (bisa rolling bertahap mis. 10% → 50% → 100%)

## F. Pasca-rilis

- [ ] Simpan backup keystore & credentials (jika EAS-managed, catat di 1Password/vault)
- [ ] Catat SHA-1/SHA-256 (untuk Google Sign-In / Maps API key bila nanti perlu)
- [ ] Pantau review, crash (VT / Play Vitals), dan ANR
- [ ] Update: ubah `version` & `versionCode` di `app.json`, rebuild AAB, upload sebagai release baru

---

## Catatan penting

- **Package ID `id.sagansa.attendance` permanen** — tidak bisa diubah setelah rilis pertama.
- **Keystore harus sama** untuk semua update. Kehilangan = tidak bisa update app yang sama.
  Jika EAS-managed, catat di vault; cadangkan secara lokal bila perlu.
- **Privacy Policy URL wajib publik** dan dapat diakses tanpa login.
- **App name localization di Play Store listing** diatur di Play Console (bukan di APK).
  Yang di APK adalah nama di **launcher** (sudah ditangani plugin langkah B).
