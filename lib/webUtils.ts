import { Platform } from 'react-native';

/**
 * Melepas fokus dari elemen yang sedang aktif saat di web.
 *
 * Berguna untuk menutup keyboard / dropdown native-input (mis. <select>) sebelum
 * membuka Modal, agar tidak ada elemen yang tetap "focused" di balik overlay.
 * No-op di platform non-web.
 */
export function blurActiveElementOnWeb(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}
