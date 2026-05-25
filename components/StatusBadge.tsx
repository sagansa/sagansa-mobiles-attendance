import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatusBadgeProps {
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

const STATUS_COLORS: Record<string, { background: string; text: string }> = {
  pending: { background: '#FEF3C7', text: '#92400E' },
  approved: { background: '#DCFCE7', text: '#166534' },
  rejected: { background: '#FEE2E2', text: '#991B1B' },
};

function StatusBadgeComponent({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const label = STATUS_LABELS[normalized] ?? status;
  const colors = STATUS_COLORS[normalized] ?? { background: '#E5E7EB', text: '#374151' };

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export const StatusBadge = memo(StatusBadgeComponent);
