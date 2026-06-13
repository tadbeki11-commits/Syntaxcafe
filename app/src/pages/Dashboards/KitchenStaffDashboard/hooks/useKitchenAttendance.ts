import { useState, useEffect } from "react";
import api from "@/application";
import toast from "react-hot-toast";

export const useKitchenAttendance = (userId?: string | number) => {
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);

  // Fetch current attendance status on mount
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      try {
        const response = (await api.attendance.getCurrentStatus(userId)) as any;
        setAttendanceStatus(response.data.data.currentStatus || null);
      } catch (error) {
        console.error("Error fetching attendance status:", error);
      }
    };

    fetchAttendanceStatus();
  }, [userId]);

  const handleClockIn = async () => {
    try {
      await api.attendance.clockIn({ user_id: userId });
      const response = (await api.attendance.getCurrentStatus(userId)) as any;
      setAttendanceStatus(response.data.data.currentStatus);
      return true;
    } catch (error) {
      console.error("Clock in error:", error);
      return false;
    }
  };

  const handleClockOut = async () => {
    try {
      await api.attendance.clockOut({ user_id: userId });
      setAttendanceStatus(null);
      return true;
    } catch (error) {
      console.error("Clock out error:", error);
      return false;
    }
  };

  return {
    attendanceStatus,
    setAttendanceStatus,
    handleClockIn,
    handleClockOut,
  };
};
