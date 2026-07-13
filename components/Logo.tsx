import { Image } from 'expo-image';
import { StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

const LOGO_SOURCE = require('../assets/images/logo.png');

type LogoProps = {
  /** Sisi logo dalam px (logo selalu persegi). Default 96. */
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/**
 * Logo merek Sagansa Attendance.
 *
 * Merender `expo-image` dari asset `logo.png` (master emblem transparan yang
 * dihasilkan `scripts/generate-icons.py`). Pakai `contentFit="contain"` agar
 * emblem tidak ter-distorsi pada ukuran apa pun. Background mengikuti parent
 * (emblem transparan) — cocok di atas permukaan apa pun.
 */
export function Logo({ size = 96, style }: LogoProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={LOGO_SOURCE}
        style={[styles.image, { width: size, height: size }, style]}
        contentFit="contain"
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    // dimensi di-set dinamis dari props
  },
});
