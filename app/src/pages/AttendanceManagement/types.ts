export interface AttendanceRecord {
  id: number;
  user_id: number;
  full_name: string;
  username: string;
  role: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  hours_worked: number | string | null;
  status?: string;
}

export interface WeeklyReportRecord {
  user_id: number;
  full_name: string;
  username: string;
  role: string;
  week_start: string;
  days_worked: number;
  total_hours: number | string;
}

export interface AttendanceStats {
  todayPresent: number;
  activeEmployees: number;
  totalHoursToday: string;
  avgHours: string;
}
