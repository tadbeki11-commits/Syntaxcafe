import { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/application";
import toast from "react-hot-toast";
import { AttendanceRecord, WeeklyReportRecord, AttendanceStats } from "../types";
import { CACHE_KEY, CACHE_TTL } from "../constants";
import {
  getApproximateServerDateString,
  getApproximateServerNow,
} from "@/shared/utils/serverTime";

export const useAttendanceData = () => {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);

  const getArr = useCallback((r: PromiseSettledResult<any>, f: string) => {
    if (r?.status !== 'fulfilled') return null;
    const d = r.value?.data?.data?.[f] ?? r.value?.data?.[f];
    return Array.isArray(d) ? d : [];
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        const now = getApproximateServerNow();
        if (now - p.ts < CACHE_TTL) {
          setAttendanceData(p.data.attendanceData || []);
          setWeeklyReport(p.data.weeklyReport || []);
          setTodayAttendance(p.data.todayAttendance || []);
          setLoading(false);
        }
      }
      const [aR, wR, tR] = await Promise.allSettled([
        api.attendance.getAll(),
        api.attendance.getWeeklyReport(),
        api.attendance.getTodayAttendance()
      ]);
      const a = getArr(aR, 'attendance');
      const w = getArr(wR, 'report');
      const t = getArr(tR, 'attendance');

      if (a) setAttendanceData(a);
      if (w) setWeeklyReport(w);
      if (t) setTodayAttendance(t);

      if (a || w || t) {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            ts: getApproximateServerNow(),
            data: {
              attendanceData: a || [],
              weeklyReport: w || [],
              todayAttendance: t || [],
            },
          }),
        );
      }
    } catch {
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [getArr]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = useMemo<AttendanceStats>(() => {
    const today = getApproximateServerDateString();
    const todayRecs = attendanceData.filter(r => r.date === today);
    const totalHoursNum = todayRecs.reduce((s, r) => s + (parseFloat(String(r.hours_worked || 0))), 0);

    return {
      todayPresent: todayRecs.length,
      activeEmployees: todayRecs.filter(r => !r.clock_out_time).length,
      totalHoursToday: totalHoursNum.toFixed(1),
      avgHours: todayRecs.length > 0 ? (totalHoursNum / todayRecs.length).toFixed(1) : '0.0',
    };
  }, [attendanceData]);

  const exportCSV = useCallback(() => {
    try {
      const today = getApproximateServerDateString();
      const headers = ['Employee Name', 'Username', 'Role', 'Clock In', 'Clock Out', 'Hours', 'Status'];
      const rows = todayAttendance.map(r => [
        r.full_name || '',
        r.username || '',
        (r.role || '').replace('_', ' '),
        r.clock_in_time ? new Date(r.clock_in_time).toLocaleString() : '-',
        r.clock_out_time ? new Date(r.clock_out_time).toLocaleString() : '-',
        r.hours_worked ? `${parseFloat(String(r.hours_worked)).toFixed(1)}h` : '-',
        !r.clock_out_time ? 'Active' : 'Completed'
      ]);
      const csv = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      link.download = `attendance-${today}.csv`;
      link.click();
      toast.success('Report exported!');
    } catch {
      toast.error('Export failed');
    }
  }, [todayAttendance]);

  return {
    loading,
    attendanceData,
    weeklyReport,
    todayAttendance,
    stats,
    exportCSV
  };
};

export default useAttendanceData;
