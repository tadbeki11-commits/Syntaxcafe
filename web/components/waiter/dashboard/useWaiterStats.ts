"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo } from "react";

export const useWaiterStats = (orders: any[], statsRange: string) => {
  const normalizeStatus = (s: any) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .trim();

  const getDateRange = (range: string) => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    if (range === "today") {
      from = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
      to = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
    } else if (range === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      to = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (range === "week") {
      from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
    } else if (range === "month") {
      from = new Date(now);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
    }

    return { from, to };
  };

  return useMemo(() => {
    const { from, to } = getDateRange(statsRange);
    const ordersArray = Array.isArray(orders) ? orders : [];

    const rangeOrders =
      from && to
        ? ordersArray.filter((o: any) => {
            const d = new Date(o.created_at);
            if (Number.isNaN(d.getTime())) return false;
            return d >= from! && d <= to!;
          })
        : ordersArray;

    const served = rangeOrders.filter((o: any) => {
      const st = normalizeStatus(o.status);
      const pst = normalizeStatus(o.payment_status);
      return ["completed", "paid"].includes(st) || pst === "paid";
    });

    const revenue = served.reduce(
      (sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0),
      0,
    );

    const pendingBalance = rangeOrders
      .filter((o: any) => {
        const st = normalizeStatus(o.status);
        const pst = normalizeStatus(o.payment_status);
        const isCanceled =
          st === "deleted" || st === "cancelled" || st === "canceled";
        const isPaid = pst === "paid" || st === "paid" || st === "completed";
        return !isCanceled && !isPaid;
      })
      .reduce(
        (sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0),
        0,
      );

    return {
      rangeOrders,
      stats: {
        ordersCreated: rangeOrders.length,
        ordersServed: served.length,
        totalRevenue: revenue,
        pendingBalance,
      },
    };
  }, [orders, statsRange]);
};
