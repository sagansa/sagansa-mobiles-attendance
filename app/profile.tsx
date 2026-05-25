import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CenteredLoader } from '@/components/CenteredLoader';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { user, roles, isBootstrapping } = useAuth();

  const primaryRole = useMemo(() => roles[0] ?? 'Pengguna', [roles]);

  if (isBootstrapping && !user) {
    return <CenteredLoader />;
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Profil tidak tersedia. Silakan masuk kembali.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Nama</Text>
        <Text style={styles.value}>{user.name}</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user.email}</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Peran Utama</Text>
        <Text style={styles.value}>{primaryRole}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#DC2626',
    marginTop: 32,
  },
});
