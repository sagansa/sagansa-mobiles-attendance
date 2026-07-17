import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { Attendance } from '@/types/api';

interface AttendanceCardProps {
  attendance: Attendance;
  showStatus?: boolean;
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Tanggal tidak diketahui';
  }

  try {
    return new Date(value).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function formatTime(value?: string | null) {
  if (!value) {
    return '—';
  }

  try {
    return new Date(value).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function AttendanceCardComponent({ attendance, showStatus = true }: AttendanceCardProps) {
  const dateReference = attendance.check_in ?? attendance.created_at;
  const checkInLabel = formatTime(attendance.check_in);
  const checkOutLabel = formatTime(attendance.check_out);
  const creatorName = attendance.creator?.name ?? attendance.created_by?.name;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.storeName}>{attendance.store?.nickname ?? attendance.store?.name ?? 'Lokasi tidak diketahui'}</Text>
          {creatorName ? (
            <Text style={styles.creatorName}>{creatorName}</Text>
          ) : null}
          <Text style={styles.dateText}>{formatDate(dateReference)}</Text>
          {attendance.shift_store?.name ? (
            <Text style={styles.storeMeta}>{attendance.shift_store.name}</Text>
          ) : null}
        </View>
        {showStatus ? <StatusBadge status={attendance.status} /> : null}
      </View>

      <View style={styles.row}>
        <View style={styles.timeColumn}>
          <Text style={styles.label}>Check-in</Text>
          <Text style={styles.value}>{checkInLabel}</Text>
          <View style={styles.columnBadges}>
            {attendance.was_late ? (
              <View style={[styles.badge, styles.badgeLate]}>
                <Text style={styles.badgeText}>Terlambat</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.timeColumn}>
          <Text style={styles.label}>Check-out</Text>
          <Text style={styles.value}>{checkOutLabel}</Text>
          <View style={styles.columnBadges}>
            {attendance.was_early_leave ? (
              <View style={[styles.badge, styles.badgeEarly]}>
                <Text style={styles.badgeText}>Pulang Cepat</Text>
              </View>
            ) : null}
            {attendance.auto_checked_out_at ? (
              <View style={[styles.badge, styles.badgeAuto]}>
                <Text style={styles.badgeText}>Auto Check-out</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  storeMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  timeColumn: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  columnBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeLate: {
    backgroundColor: '#FEF3C7',
  },
  badgeOnTime: {
    backgroundColor: '#D1FAE5',
  },
  badgeEarly: {
    backgroundColor: '#FEE2E2',
  },
  badgeAuto: {
    backgroundColor: '#E0F2FE',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export const AttendanceCard = memo(AttendanceCardComponent);
