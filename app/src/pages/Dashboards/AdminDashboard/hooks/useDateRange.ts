import { useState, useMemo } from "react";
import {
  getApproximateServerDate,
  getApproximateServerDateString,
} from "@/shared/utils/serverTime";
import { DateRange } from "../types";

export const useDateRange = (initialTimeRange: string = "today") => {
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [customMode, setCustomMode] = useState("single");
  const [customDate, setCustomDate] = useState(
    () => getApproximateServerDateString(),
  );
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = getApproximateServerDate();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(
    () => getApproximateServerDateString(),
  );

  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case "today":
        return "Today";
      case "week":
        return "Week";
      case "month":
        return "Month";
      case "custom":
        return "Custom";
      case "all":
      default:
        return "All";
    }
  }, [timeRange]);

  const getDateRange = (): DateRange => {
    if (timeRange === "all") return { from: null, to: null };

    const now = getApproximateServerDate();
    const todayFrom = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const todayTo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    if (timeRange === "today") return { from: todayFrom, to: todayTo };

    if (timeRange === "week") {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to: now };
    }

    if (timeRange === "month") {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from, to: now };
    }

    if (timeRange === "custom") {
      const parseYmd = (ymd: string) => {
        if (!ymd || typeof ymd !== "string") return null;
        const parts = ymd.split("-");
        if (parts.length !== 3) return null;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
          return null;
        return { y, m, d };
      };

      const startOfDay = (ymd: string) => {
        const p = parseYmd(ymd);
        if (!p) return null;
        return new Date(p.y, p.m - 1, p.d, 0, 0, 0, 0);
      };

      const endOfDay = (ymd: string) => {
        const p = parseYmd(ymd);
        if (!p) return null;
        return new Date(p.y, p.m - 1, p.d, 23, 59, 59, 999);
      };

      if (customMode === "single") {
        const from = startOfDay(customDate);
        const to = endOfDay(customDate);
        return from && to ? { from, to } : { from: null, to: null };
      }

      const selectedFrom = startOfDay(customStartDate);
      const selectedTo = endOfDay(customEndDate);
      if (!selectedFrom || !selectedTo) return { from: null, to: null };

      const from = selectedFrom <= selectedTo ? selectedFrom : selectedTo;
      const to = selectedFrom <= selectedTo ? selectedTo : selectedFrom;

      return { from, to };
    }

    return { from: null, to: null };
  };

  const customRangeText = useMemo(() => {
    if (timeRange !== "custom") return "";

    const parseYmdAsLocalDate = (ymd: string) => {
      if (!ymd || typeof ymd !== "string") return null;
      const parts = ymd.split("-");
      if (parts.length !== 3) return null;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
        return null;
      return new Date(y, m - 1, d);
    };

    if (customMode === "single") {
      const d = parseYmdAsLocalDate(customDate);
      if (!d || Number.isNaN(d.getTime())) return "";
      const today = getApproximateServerDate();
      const today0 = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (d0.getTime() === today0.getTime()) return "Today";
      return d.toLocaleDateString();
    }

    const dStart = parseYmdAsLocalDate(customStartDate);
    const dEnd = parseYmdAsLocalDate(customEndDate);

    if (
      !dStart ||
      Number.isNaN(dStart.getTime()) ||
      !dEnd ||
      Number.isNaN(dEnd.getTime())
    )
      return "";

    const startObj = dStart <= dEnd ? dStart : dEnd;
    const endObj = dStart <= dEnd ? dEnd : dStart;

    if (startObj.getTime() === endObj.getTime()) {
      const today = getApproximateServerDate();
      const today0 = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const start0 = new Date(
        startObj.getFullYear(),
        startObj.getMonth(),
        startObj.getDate(),
      );
      if (start0.getTime() === today0.getTime()) return "Today";
      return startObj.toLocaleDateString();
    }

    return `${startObj.toLocaleDateString()} → ${endObj.toLocaleDateString()}`;
  }, [timeRange, customMode, customDate, customStartDate, customEndDate]);

  const withinRange = (createdAt: string | null | undefined): boolean => {
    if (timeRange === "all") return true;
    const date = createdAt ? new Date(createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) return false;

    const { from, to } = getDateRange();
    if (from && to) return date >= from && date <= to;
    return false;
  };

  return {
    timeRange,
    setTimeRange,
    customMode,
    setCustomMode,
    customDate,
    setCustomDate,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    timeRangeLabel,
    getDateRange,
    customRangeText,
    withinRange,
  };
};
