// @ts-nocheck
import { getLocalDb, localDbTables } from "@/db/localDb";
import { api, isOnline } from "@/infrastructure/api/http-client";
import { eq } from "drizzle-orm";
import { readRows } from "@/infrastructure/database/local-db-query";
import {
  getApproximateServerDate,
  getApproximateServerDateString,
  getApproximateServerIsoString,
} from "@/shared/utils/serverTime";

const readRawRows = async (table: any) => {
  return readRows(table);
};

export const attendanceAdapter = {
  getAll: async (params?: any) => {
    const records = await readRawRows(localDbTables.attendance);
    const users = await readRawRows(localDbTables.users);
    const userMap = new Map(users.map((u) => [Number(u.id), u]));

    const merged = records.map((r) => {
      const u = userMap.get(Number(r.user_id));
      return {
        ...r,
        full_name: u?.full_name || u?.username || "",
        username: u?.username || "",
        role: u?.role || "",
      };
    });

    return {
      data: { status: "success", data: { attendance: merged } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  getCurrentStatus: async (userId: any) => {
    const numUserId = Number(userId);
    const records = await readRawRows(localDbTables.attendance);
    // Find active record (where clock_out_time is null/empty) for the given user
    const active = records.find(
      (r) => Number(r.user_id) === numUserId && !r.clock_out_time,
    );

    return {
      data: {
        status: "success",
        data: { currentStatus: active || null },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  getTodayAttendance: async () => {
    const todayStr = getApproximateServerDateString();
    const records = await readRawRows(localDbTables.attendance);
    const users = await readRawRows(localDbTables.users);
    const userMap = new Map(users.map((u) => [Number(u.id), u]));

    const todayRecords = records.filter((r) => r.date === todayStr);
    const merged = todayRecords.map((r) => {
      const u = userMap.get(Number(r.user_id));
      return {
        ...r,
        full_name: u?.full_name || u?.username || "",
        username: u?.username || "",
        role: u?.role || "",
      };
    });

    return {
      data: { status: "success", data: { attendance: merged } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  getWeeklyReport: async (params?: any) => {
    const records = await readRawRows(localDbTables.attendance);
    const users = await readRawRows(localDbTables.users);

    // Group records by user_id
    const userGroups = new Map<number, typeof records>();
    for (const r of records) {
      const uid = Number(r.user_id);
      if (!userGroups.has(uid)) {
        userGroups.set(uid, []);
      }
      userGroups.get(uid)!.push(r);
    }

    const report = users
      .filter((u) => u.role !== "admin")
      .map((u) => {
        const uid = Number(u.id);
        const userRecs = userGroups.get(uid) || [];

        // Count unique dates worked
        const uniqueDates = new Set(userRecs.map((r) => r.date));

        // Sum total hours worked
        const totalHours = userRecs.reduce((sum, r) => {
          const val = parseFloat(String(r.hours_worked || 0));
          return sum + (isNaN(val) ? 0 : val);
        }, 0);

        // Standard 7-day period start boundary
        const sevenDaysAgo = getApproximateServerDate();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weekStartStr = sevenDaysAgo.toISOString().split("T")[0];

        return {
          user_id: uid,
          full_name: u.full_name || u.username || "",
          username: u.username || "",
          role: u.role || "",
          week_start: weekStartStr,
          days_worked: uniqueDates.size,
          total_hours: totalHours.toFixed(1),
        };
      });

    return {
      data: { status: "success", data: { report } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  clockIn: async (userData: any) => {
    const userId = Number(userData.user_id);
    const now = getApproximateServerDate();
    const nowIso = getApproximateServerIsoString();
    const todayStr = nowIso.split("T")[0];

    // Build local attendance record
    const record = {
      user_id: userId,
      date: todayStr,
      clock_in_time: nowIso,
      clock_out_time: null,
      hours_worked: 0,
      synced: 0,
    };

    const db = await getLocalDb();
    const maxRows = await db
      .select({ maxId: localDbTables.attendance.id })
      .from(localDbTables.attendance)
      .orderBy(localDbTables.attendance.id);
    const pk = ((maxRows.at(-1)?.maxId as number | undefined) ?? 0) + 1;
    const savedRecord = { ...record, id: pk };
    await db.insert(localDbTables.attendance).values({
      id: pk,
      user_id: savedRecord.user_id,
      date: savedRecord.date,
      clock_in_time: savedRecord.clock_in_time,
      clock_out_time: savedRecord.clock_out_time,
      hours_worked: savedRecord.hours_worked,
      synced: savedRecord.synced,
      raw_json: JSON.stringify(savedRecord),
    } as any);

    return {
      data: { status: "success", data: savedRecord },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },

  clockOut: async (userData: any) => {
    const userId = Number(userData.user_id);
    const now = getApproximateServerDate();

    const records = await readRawRows(localDbTables.attendance);
    // Find active record for user
    const active = records.find(
      (r) => Number(r.user_id) === userId && !r.clock_out_time,
    );

    if (!active || !active.id) {
      throw new Error("No active attendance record found to clock out.");
    }

    const clockInTime = new Date(active.clock_in_time!);
    const diffMs = now.getTime() - clockInTime.getTime();
    const hours = Math.max(0, diffMs / (1000 * 60 * 60)); // Decimals representing hours worked

    const updated = {
      ...active,
      clock_out_time: now.toISOString(),
      hours_worked: Number(hours.toFixed(2)),
      synced: 0,
    };

    const db = await getLocalDb();
    await db
      .update(localDbTables.attendance)
      .set({
        clock_out_time: updated.clock_out_time,
        hours_worked: Number(updated.hours_worked),
        synced: updated.synced,
        raw_json: JSON.stringify(updated),
      } as any)
      .where(eq(localDbTables.attendance.id, active.id));

    return {
      data: { status: "success", data: updated },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
};
