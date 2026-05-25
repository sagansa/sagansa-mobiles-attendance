import { useCallback, useEffect, useMemo, useState } from 'react';
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

import { AttendanceCheckInPayload, AttendanceCheckOutPayload, fetchLeaveRequests } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Attendance, PaginatedResponse } from '@/types/api';

type AttendanceMeta = PaginatedResponse<Attendance>['meta'] | null;

export function useAttendance() {
  const {
    token,
    isAuthenticated,
    fetchAttendances,
    submitCheckIn,
    submitCheckOut,
  } = useAuth();

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [meta, setMeta] = useState<AttendanceMeta>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isOnLeave, setIsOnLeave] = useState(false);

  const loadAttendances = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setAttendances([]);
      setMeta(null);
      return;
    }

    setIsLoading(true);
    try {
      const [attendanceRes, leaveRes] = await Promise.all([
        fetchAttendances(1, 20),
        fetchLeaveRequests(token)
      ]);

      setAttendances(attendanceRes.data || []);
      setMeta(attendanceRes.meta || null);

      // Check for active approved leave
      const today = new Date();
      const activeLeave = leaveRes.data.find(leave => {
        if (leave.status !== 'approved') return false;

        const start = startOfDay(parseISO(leave.start_date));
        const end = endOfDay(parseISO(leave.end_date));

        return isWithinInterval(today, { start, end });
      });

      setIsOnLeave(!!activeLeave);

    } catch (error) {
      console.error('Gagal memuat data presensi', error);
      setAttendances([]);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAttendances, isAuthenticated, token]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !token) {
      return;
    }

    setIsRefreshing(true);
    try {
      const [attendanceRes, leaveRes] = await Promise.all([
        fetchAttendances(1, meta?.per_page ?? 20),
        fetchLeaveRequests(token)
      ]);

      setAttendances(attendanceRes.data || []);
      setMeta(attendanceRes.meta || null);

      // Check for active approved leave
      const today = new Date();
      const activeLeave = leaveRes.data.find(leave => {
        if (leave.status !== 'approved') return false;

        const start = startOfDay(parseISO(leave.start_date));
        const end = endOfDay(parseISO(leave.end_date));

        return isWithinInterval(today, { start, end });
      });

      setIsOnLeave(!!activeLeave);

    } catch (error) {
      console.error('Gagal memperbarui data presensi', error);
      setAttendances([]);
      setMeta(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAttendances, isAuthenticated, meta?.per_page, token]);

  useEffect(() => {
    void loadAttendances();
  }, [loadAttendances]);

  const handleCheckIn = useCallback(async (payload: AttendanceCheckInPayload) => {
    setIsCheckingIn(true);
    try {
      const response = await submitCheckIn(payload);
      const latest = response.attendance;
      setAttendances((previous) => {
        const filtered = previous.filter((item) => item.id !== latest.id);
        return [latest, ...filtered];
      });
      return latest;
    } finally {
      setIsCheckingIn(false);
    }
  }, [submitCheckIn]);

  const handleCheckOut = useCallback(async (attendanceId: string, payload: AttendanceCheckOutPayload) => {
    setIsCheckingOut(true);
    try {
      const response = await submitCheckOut(attendanceId, payload);
      const updated = response.attendance;
      setAttendances((previous) => previous.map((item) => (item.id === attendanceId ? updated : item)));
      return updated;
    } finally {
      setIsCheckingOut(false);
    }
  }, [submitCheckOut]);

  const todayAttendance = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!attendances || !Array.isArray(attendances)) {
      return null;
    }
    return (
      attendances.find((item) => {
        const reference = item.check_in ?? item.created_at ?? '';
        return reference.slice(0, 10) === today;
      }) ?? null
    );
  }, [attendances]);

  return {
    attendances,
    meta,
    isLoading,
    isRefreshing,
    isCheckingIn,
    isCheckingOut,
    refresh,
    checkIn: handleCheckIn,
    checkOut: handleCheckOut,
    todayAttendance,
    isOnLeave,
  };
}
