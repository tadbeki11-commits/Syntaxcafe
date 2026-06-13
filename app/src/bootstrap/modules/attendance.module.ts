import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { attendanceAdapter } from '@/infrastructure/adapters/attendance.adapter';
import { AttendanceFacade } from '@/application/attendance/attendance.facade';

export const registerAttendanceModule = (container: Container): void => {
  container.registerSingleton(
    TOKENS.attendanceFacade,
    new AttendanceFacade(attendanceAdapter),
  );
};
