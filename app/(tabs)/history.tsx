import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, parseISO, startOfWeek, endOfWeek } from 'date-fns';

import { AttendanceCard } from '@/components/AttendanceCard';
import { CenteredLoader } from '@/components/CenteredLoader';
import { UserMenu } from '@/components/UserMenu';
import { useAttendance } from '@/hooks/useAttendance';
import { Attendance } from '@/types/api';

type ViewMode = 'list' | 'calendar';

export default function HistoryScreen() {
  const { attendances, isLoading, isRefreshing, refresh } = useAttendance();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendances.forEach((att) => {
      if (att.check_in) {
        const dateKey = format(parseISO(att.check_in), 'yyyy-MM-dd');
        map.set(dateKey, att);
      }
    });
    return map;
  }, [attendances]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(selectedMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const renderCalendarDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const attendance = attendanceByDate.get(dateKey);
    const isCurrentMonth = date.getMonth() === selectedMonth.getMonth();
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;

    let dayStyle: any = styles.calendarDay;
    let dayTextStyle: any = styles.calendarDayText;

    if (!isCurrentMonth) {
      dayStyle = styles.calendarDayInactive;
      dayTextStyle = styles.calendarDayTextInactive;
    }

    if (isSelected) {
      dayStyle = { ...dayStyle, borderWidth: 2, borderColor: '#2563EB' };
    }

    return (
      <TouchableOpacity
        key={dateKey}
        style={dayStyle}
        onPress={() => setSelectedDate(date)}
      >
        <Text style={dayTextStyle}>{format(date, 'd')}</Text>
        {attendance && (
          <View style={styles.dotsContainer}>
            {/* Check-in Dot */}
            <View style={[
              styles.dot,
              attendance.was_late ? styles.dotLate : styles.dotPresent
            ]} />

            {/* Check-out Dot */}
            {attendance.check_out ? (
              <View style={[
                styles.dot,
                attendance.was_early_leave ? styles.dotEarly :
                  attendance.auto_checked_out_at ? styles.dotAuto : styles.dotPresent
              ]} />
            ) : (
              <View style={[styles.dot, styles.dotEmpty]} />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && attendances.length === 0) {
    return <CenteredLoader />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Riwayat Presensi</Text>
            <Text style={styles.subtitle}>Lihat seluruh catatan presensi Anda.</Text>
          </View>
          <UserMenu />
        </View>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleButtonText, viewMode === 'list' && styles.toggleButtonTextActive]}>
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
            onPress={() => setViewMode('calendar')}
          >
            <Text style={[styles.toggleButtonText, viewMode === 'calendar' && styles.toggleButtonTextActive]}>
              Calendar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={attendances}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AttendanceCard attendance={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyState}>Belum ada data presensi yang tercatat.</Text>
          }
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { void refresh(); }} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={attendances.filter((att) => {
            if (!att.check_in) return false;
            const attDate = parseISO(att.check_in);

            if (selectedDate) {
              return isSameDay(attDate, selectedDate);
            }

            return attDate.getMonth() === selectedMonth.getMonth() &&
              attDate.getFullYear() === selectedMonth.getFullYear();
          })}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AttendanceCard attendance={item} />}
          contentContainerStyle={styles.calendarListContent}
          ListHeaderComponent={
            <View>
              <Text style={styles.monthTitle}>{format(selectedMonth, 'MMMM yyyy')}</Text>

              <View style={styles.calendarGrid}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <View key={day} style={styles.calendarHeader}>
                    <Text style={styles.calendarHeaderText}>{day}</Text>
                  </View>
                ))}
                {calendarDays.map(renderCalendarDay)}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#059669' }]} />
                  <Text style={styles.legendText}>Hadir</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#D97706' }]} />
                  <Text style={styles.legendText}>Terlambat</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#F3F4F6' }]} />
                  <Text style={styles.legendText}>Tidak Hadir</Text>
                </View>
              </View>

              <Text style={styles.listTitle}>
                {selectedDate
                  ? `Presensi Tanggal ${format(selectedDate, 'd MMMM yyyy')}`
                  : 'Daftar Presensi Bulan Ini'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyState}>
              {selectedDate
                ? 'Tidak ada data presensi pada tanggal ini.'
                : 'Tidak ada presensi di bulan ini.'}
            </Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  headerContainer: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#111827',
  },
  listContent: {
    padding: 20,
    paddingBottom: 32,
  },
  emptyState: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 40,
  },
  calendarListContent: {
    padding: 20,
    paddingBottom: 32,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 16,
  },
  calendarContainer: {
    flex: 1,
    padding: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
  },
  calendarHeader: {
    width: '14.28%',
    padding: 8,
    alignItems: 'center',
  },
  calendarHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    margin: 2,
    borderRadius: 8,
  },
  calendarDayInactive: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    margin: 2,
    borderRadius: 8,
  },
  calendarDayPresent: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    margin: 2,
    borderRadius: 8,
  },
  calendarDayLate: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    margin: 2,
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  calendarDayTextInactive: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  calendarDayTextPresent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotPresent: {
    backgroundColor: '#059669', // Emerald 600 - More visible green
  },
  dotLate: {
    backgroundColor: '#D97706', // Amber 600 - More visible orange
  },
  dotEarly: {
    backgroundColor: '#DC2626', // Red 600
  },
  dotAuto: {
    backgroundColor: '#2563EB', // Blue 600
  },
  dotEmpty: {
    backgroundColor: '#E5E7EB',
  },
});
