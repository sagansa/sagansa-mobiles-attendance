import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';

function UpdateScreen() {
  const { updateData, openUpdateUrl } = useAuth();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: 24 }}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⬆️</Text>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 8, textAlign: 'center' }}>
          Update Tersedia
        </Text>
        <Text style={{ fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24 }}>
          {updateData?.message || 'Versi aplikasi Anda sudah usang. Silakan update ke versi terbaru.'}
        </Text>
      </View>

      {updateData?.release_notes && (
        <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24, width: '100%', maxWidth: 400 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#f8fafc', marginBottom: 8 }}>
            Release Notes:
          </Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', lineHeight: 20 }}>
            {updateData.release_notes}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={openUpdateUrl}
        style={{ backgroundColor: '#3b82f6', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, width: '100%', maxWidth: 400, alignItems: 'center' }}
        activeOpacity={0.8}
      >
        <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700' }}>
          Update Sekarang
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const { needsUpdate, isBootstrapping } = useAuth();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded || isBootstrapping) {
    return null;
  }

  if (needsUpdate) {
    return <UpdateScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="leave-request" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}
