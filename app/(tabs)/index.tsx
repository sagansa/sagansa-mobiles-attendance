import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AttendanceCard } from '@/components/AttendanceCard';
import { CenteredLoader } from '@/components/CenteredLoader';
import { CheckInOutModal } from '@/components/CheckInOutModal';
import { UserMenu } from '@/components/UserMenu';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/hooks/useAuth';
import { useStores } from '@/hooks/useStores';
import { AttendanceCheckInPayload, AttendanceCheckOutPayload } from '@/lib/api';
import { ApiError } from '@/types/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    attendances,
    todayAttendance,
    isLoading,
    isRefreshing,
    isCheckingIn,
    isCheckingOut,
    refresh,
    checkIn,
    checkOut,
    isOnLeave,
  } = useAttendance();

  const [isCheckInModalVisible, setCheckInModalVisible] = useState(false);
  const [isCheckOutModalVisible, setCheckOutModalVisible] = useState(false);
  const { stores: storeOptions, shiftStores: shiftOptions } = useStores();

  const canCheckIn = !todayAttendance && !isOnLeave;
  const needsCheckout = Boolean(todayAttendance && !todayAttendance.check_out);
  const recentAttendances = useMemo(() => {
    if (!attendances || !Array.isArray(attendances)) {
      return [];
    }
    // Exclude today's attendance from recent history
    return attendances
      .filter(att => att.id !== todayAttendance?.id)
      .slice(0, 5);
  }, [attendances, todayAttendance]);
  const defaultStoreId = storeOptions[0]?.id ?? null;

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const handleCheckInSubmit = useCallback(async (payload: AttendanceCheckInPayload) => {
    try {
      await checkIn(payload);
      Alert.alert('Berhasil', 'Check-in berhasil dicatat. Selamat bekerja!');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError('Terjadi kesalahan saat check-in. Silakan coba lagi.', 500);
    }
  }, [checkIn]);

  const handleCheckOutSubmit = useCallback(async (payload: AttendanceCheckOutPayload) => {
    if (!todayAttendance) {
      throw new ApiError('Tidak ada presensi yang perlu di-check-out.', 422);
    }

    try {
      await checkOut(todayAttendance.id, payload);
      Alert.alert('Berhasil', 'Check-out berhasil dicatat.');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError('Terjadi kesalahan saat check-out. Silakan coba lagi.', 500);
    }
  }, [checkOut, todayAttendance]);

  const openCheckInModal = useCallback(() => {
    if (isOnLeave) {
      Alert.alert('Sedang Cuti', 'Anda tidak dapat melakukan check-in karena sedang dalam masa cuti.');
      return;
    }

    if (!storeOptions.length) {
      Alert.alert('Data belum lengkap', 'Store belum tersedia. Hubungi admin untuk melengkapi data.');
      return;
    }

    if (!shiftOptions.length) {
      Alert.alert('Data belum lengkap', 'Shift belum tersedia. Hubungi admin untuk melengkapi data.');
      return;
    }

    setCheckInModalVisible(true);
  }, [shiftOptions.length, storeOptions.length, isOnLeave]);

  const openCheckOutModal = useCallback(() => {
    if (!todayAttendance) {
      Alert.alert('Informasi', 'Tidak ada presensi yang perlu di-check-out.');
      return;
    }

    if (!storeOptions.length) {
      Alert.alert('Data belum lengkap', 'Hubungi admin untuk memastikan data store tersedia.');
      return;
    }

    setCheckOutModalVisible(true);
  }, [storeOptions.length, todayAttendance]);

  const handleCheckInPress = useCallback(() => {
    openCheckInModal();
  }, [openCheckInModal]);

  const handleCheckOutPress = useCallback(() => {
    openCheckOutModal();
  }, [openCheckOutModal]);

  const latenessMessage = useMemo(() => {
    if (!todayAttendance) {
      return null;
    }

    if (todayAttendance.auto_checked_out_at) {
      return 'Check-out dilakukan otomatis karena melebihi batas waktu 4 jam.';
    }

    if (todayAttendance.was_late) {
      return '🔴 Anda terlambat dibandingkan jadwal shift.';
    }

    // Show on-time message only if checked in (not pending/rejected)
    if (todayAttendance.check_in && todayAttendance.status === 'approved') {
      return '🟢 Anda check-in tepat waktu.';
    }

    return null;
  }, [todayAttendance]);

  if (isLoading && attendances.length === 0) {
    return <CenteredLoader />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { void refresh(); }} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo, {user?.name?.split(' ')[0] ?? 'Pengguna'} 👋</Text>
          <Text style={styles.subtitle}>Siap untuk hari yang produktif?</Text>
        </View>
        <UserMenu />
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Presensi Hari Ini</Text>
        {todayAttendance ? (
          <AttendanceCard attendance={todayAttendance} showStatus />
        ) : (
          <Text style={styles.emptyState}>Belum ada presensi untuk hari ini.</Text>
        )}

        <View style={styles.buttonRow}>
          {isOnLeave && (
            <View style={styles.leaveContainer}>
              <Text style={styles.leaveText}>🏖️ Anda sedang cuti hari ini.</Text>
            </View>
          )}

          {canCheckIn && (
            <TouchableOpacity
              style={[styles.primaryButton, isCheckingIn && styles.buttonDisabled]}
              disabled={isCheckingIn}
              onPress={handleCheckInPress}
            >
              <Text style={styles.buttonText}>{isCheckingIn ? 'Memproses...' : 'Check-in'}</Text>
            </TouchableOpacity>
          )}

          {needsCheckout && (
            <TouchableOpacity
              style={[styles.secondaryButton, isCheckingOut && styles.buttonDisabled]}
              disabled={isCheckingOut}
              onPress={handleCheckOutPress}
            >
              <Text style={styles.secondaryButtonText}>{isCheckingOut ? 'Memproses...' : 'Check-out'}</Text>
            </TouchableOpacity>
          )}

          {!canCheckIn && !needsCheckout && todayAttendance && (
            <View style={styles.completedContainer}>
              <Text style={styles.completedText}>✅ Presensi Hari Ini Selesai</Text>
            </View>
          )}
        </View>


      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Riwayat Terbaru</Text>
        <Text style={styles.sectionSubtitle}>Lima presensi terakhir Anda</Text>
      </View>

      {recentAttendances.length === 0 ? (
        <Text style={styles.emptyState}>Belum ada riwayat presensi yang dapat ditampilkan.</Text>
      ) : (
        recentAttendances.map((attendance) => (
          <AttendanceCard key={attendance.id} attendance={attendance} showStatus />
        ))
      )}

      <CheckInOutModal
        visible={isCheckInModalVisible}
        mode="check-in"
        onClose={() => setCheckInModalVisible(false)}
        onSubmit={handleCheckInSubmit}
        isSubmitting={isCheckingIn}
        stores={storeOptions}
        shiftStores={shiftOptions}
        initialStoreId={defaultStoreId}
      />

      <CheckInOutModal
        visible={isCheckOutModalVisible}
        mode="check-out"
        onClose={() => setCheckOutModalVisible(false)}
        onSubmit={handleCheckOutSubmit}
        isSubmitting={isCheckingOut}
        stores={storeOptions}
        shiftStores={shiftOptions}
        initialStoreId={todayAttendance?.store_id ?? defaultStoreId}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyState: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  attendanceHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
  },
  menuRow: {
    flexDirection: 'row',
    gap: 12,
  },
  menuButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  menuButtonIcon: {
    fontSize: 24,
  },
  menuButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  completedContainer: {
    flex: 1,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
  },
  completedText: {
    color: '#047857',
    fontWeight: '600',
    fontSize: 16,
  },
  statusContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusLate: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusOnTime: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  statusText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  statusTextLate: {
    color: '#B91C1C',
  },
  statusTextOnTime: {
    color: '#0369A1',
  },
  leaveContainer: {
    flex: 1,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center',
  },
  leaveText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 16,
  },
});
