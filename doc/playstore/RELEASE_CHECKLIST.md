# Release Checklist — Sagansa Attendance → Google Play Store

Urutan langkah submit ke Play Console. Centang saat selesai.

---

## A. Pra-submit (sudah disiapkan di repo ini)

- [x] `app.json` final: `name`, `android.package = id.sagansa.attendance`, `versionCode`, `permissions`
- [x] Plugin lokalisasi nama app (`plugins/withAndroidAppName.js`) → `values-id`/`values-in`
- [x] Aset branding tema Lokal Indonesia (`assets/images/*`, `assets/store/playstore-icon.png`)
- [x] **Bare workflow** (folder `android/` di-commit), signing via `android/key.properties`
- [x] Keystore release `upload-keystore.jks` (reuse dari `mobiles/point-of-sale`)
- [x] `.gitignore` mengeksklud secret & build artifact
- [x] Dokumen: `LISTING.md`, `DATA_SAFETY.md`, `PRIVACY_POLICY.md`, `RELEASE_CHECKLIST.md`

## Stack versi (Expo SDK 57)

| Komponen | Versi |
|---|---|
| Expo SDK | 57.0.4 |
| React Native | 0.86.0 |
| React | 19.2.3 |
| Gradle | 9.3.1 |
| Hermes | v0.17.0 |

## B. Verifikasi sebelum build

- [ ] Jalankan `npx expo prebuild --platform android --no-install` bila `android/` perlu diregenerate
  - **PERINGATAN**: `prebuild` (apalagi dengan `--clean`) MENGHAPUS signing block di
    `android/app/build.gradle`. Setelah prebuild, WAJIB re-apply manual:
    1. Block `def keystoreProperties = new Properties()` ... `def hasReleaseKeystore` di puncak file
       (setelah `def projectRoot`).
    2. `signingConfigs.release { if (hasReleaseKeystore) { ... } }`.
    3. `buildTypes.release { signingConfig hasReleaseKeystore ? signingConfigs.release : signingConfigs.debug }`.
    Sumber kebenaran: `key.properties.example` + git history commit signing-fix.
  - Lebih aman: **hindari `--clean`** bila hanya bump version — cukup edit `versionCode`/`versionName`
    di `app.json` lalu `sed`/manual update `android/app/build.gradle` field `versionCode`/`versionName`
    (prebuild tidak diperlukan untuk bump versi murni).
- [ ] Build APK preview & smoke-test install di device fisik / emulator:
  ```bash
  cd android && ./gradlew assembleRelease
  # output: android/app/build/outputs/apk/release/app-release.apk
  ```
  Cek: nama launcher (ganti locale HP ke ID), permission prompt, clock-in/out, foto, cuti
- [ ] Verifikasi nama launcher: locale HP Indonesia → "Hadir by Sagansa"; locale English → "Sagansa Attendance"

## C. Build AAB production

- [ ] Pastikan `android/key.properties` ada (di-gitignore; salin dari point-of-sale atau lihat `key.properties.example`)
- [ ] Build:
  ```bash
  cd android
  export JAVA_HOME=$(/usr/libexec/java_home -v 17)
  ./gradlew bundleRelease
  ```
- [ ] Output: `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] **Verifikasi AAB benar-benar di-sign dengan upload key** (bukan debug keystore):
  ```bash
  AAB=android/app/build/outputs/bundle/release/app-release.aab
  TMP=$(mktemp -d)
  unzip -o "$AAB" "META-INF/*.RSA" -d "$TMP" >/dev/null
  keytool -printcert -file "$TMP"/META-INF/*.RSA | grep SHA1
  rm -rf "$TMP"
  ```
  HARUS cocok SHA1 `94:06:1E:64:56:BF:E0:25:09:BC:97:40:2F:60:E3:FF:63:51:79:D1`.
  Bila muncul SHA1 lain (mis. `5E:8F:16:...`) → AAB ter-sign debug keystore;
  cek `buildTypes.release` pakai `signingConfigs.release` (bukan `.debug`)
  dan `android/key.properties` terisi benar.
- [ ] Verifikasi keystore source: `keytool -list -keystore ../upload-keystore.jks -storepass <pass> -alias upload -v`
  sebagai cross-check.
- [ ] Catat: build number, commit SHA, ukuran AAB

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

- [ ] Simpan backup keystore `upload-keystore.jks` di tempat aman (1Password / vault)
- [ ] Catat SHA-1/SHA-256 (untuk Google Sign-In / Maps API key bila nanti perlu)
- [ ] Pantau review, crash (Play Vitals), dan ANR
- [ ] Update: ubah `version` & `android.versionCode` di `app.json`, lalu `cd android && ./gradlew bundleRelease`,
      upload sebagai release baru

---

## Catatan penting

- **Package ID `id.sagansa.attendance` permanen** — tidak bisa diubah setelah rilis pertama.
- **Keystore harus sama** untuk semua update. Kehilangan = tidak bisa update app yang sama.
  Keystore saat ini di-share dengan `mobiles/point-of-sale` (`id.sagansa.pos`) — aman, Play Store izinkan
  keystore sama untuk app berbeda.
- **Privacy Policy URL wajib publik** dan dapat diakses tanpa login.
- **App name localization di Play Store listing** diatur di Play Console (bukan di APK).
  Yang di APK adalah nama di **launcher** (sudah ditangani plugin `withAndroidAppName`).
- **Build butuh JDK 17**: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`
