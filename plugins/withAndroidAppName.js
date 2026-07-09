/**
 * withAndroidAppName — Expo config plugin (local)
 *
 * Meng-override nama app di launcher Android berdasarkan locale perangkat:
 *   - Default (en / locale lain): "Sagansa Attendance" (sudah diatur oleh app.json
 *     `expo.name` -> plugin bawaan Expo menulis values/strings.xml)
 *   - Indonesia (values-id / values-in): "Hadir by Sagansa"
 *
 * Mekanisme: menulis res/values-<locale>/strings.xml berisi
 *   <string name="app_name">...</string>
 * Android otomatis memilih resource sesuai locale; bila tidak cocok, fallback ke values/.
 *
 * Catatan: expo SDK 56 tidak menyediakan mod "values-<locale>/strings.xml" bawaan,
 * jadi kami pakai withDangerousMod untuk menulis file sebelum build Gradle.
 *
 * Referensi:
 *   - https://developer.android.com/guide/topics/resources/localization
 *   - https://github.com/expo/eas-cli/issues/458
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Map folder locale Android -> nama app.
// `id` = ISO-639-1 modern, `in` = kode legacy (Android <7) tetap didukung.
const LOCALIZED_NAMES = {
  id: 'Hadir by Sagansa',
  in: 'Hadir by Sagansa',
};

function escapeXmlValue(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, "\\'");
}

/**
 * Tulis (atau timpa) res/values-<locale>/strings.xml supaya app_name selalu
 * sinkron dengan LOCALIZED_NAMES. Idempoten: aman dijalankan ulang.
 */
function writeLocaleStrings(projectRoot, locale, appName) {
  const resDir = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'res',
    `values-${locale}`
  );
  fs.mkdirSync(resDir, { recursive: true });
  const stringsXmlPath = path.join(resDir, 'strings.xml');

  const content = `<?xml version="1.0" encoding="utf-8"?>
<!-- Dibuat otomatis oleh plugins/withAndroidAppName.js. Jangan edit manual. -->
<resources>
    <string name="app_name">${escapeXmlValue(appName)}</string>
</resources>
`;
  fs.writeFileSync(stringsXmlPath, content, 'utf8');
}

module.exports = function withAndroidAppName(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      for (const [locale, name] of Object.entries(LOCALIZED_NAMES)) {
        writeLocaleStrings(projectRoot, locale, name);
      }
      return modConfig;
    },
  ]);
};
