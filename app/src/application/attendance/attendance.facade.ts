// @ts-nocheck
import { attendanceAdapter } from '@/infrastructure/adapters/attendance.adapter';

type AttendanceAdapter = typeof attendanceAdapter;

export class AttendanceFacade {
  constructor(
    private readonly adapter: AttendanceAdapter,
  ) {}

  getAll = (params?: unknown) => this.adapter.getAll(params);
  getCurrentStatus = (userId: unknown) => this.adapter.getCurrentStatus(userId);
  getTodayAttendance = () => this.adapter.getTodayAttendance();
  getWeeklyReport = (params?: unknown) => this.adapter.getWeeklyReport(params);

  clockIn = async (userData: Record<string, unknown>) => {
    const result = await this.adapter.clockIn(userData);
    return result;
  };

  clockOut = async (userData: Record<string, unknown>) => {
    const result = await this.adapter.clockOut(userData);
    return result;
  };
}
