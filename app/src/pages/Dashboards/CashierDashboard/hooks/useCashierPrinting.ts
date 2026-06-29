import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/application";
import toast from "react-hot-toast";
import { getActivePrinterName } from "@/pages/cashier/PrinterSettings";
import { getApproximateServerNow } from "@/shared/utils/serverTime";
import { orderSocket } from "@/infrastructure/realtime/order-socket";
import { persistServerOrders } from "@/infrastructure/adapters/orders.adapter";

interface PrintingProps {
  refreshDashboardData: () => Promise<void>;
  // When false, the background engine (socket subscription and polling loop)
  // stays dormant. The interactive helpers (printOrderImmediately, testQzPrint)
  // remain callable. Used so only the cashier role runs the auto-print engine.
  enabled?: boolean;
}

export interface StuckPrintOrder {
  id: number;
  table_number?: any;
  attempts: number;
  error: string;
}

// After this many consecutive failed print attempts, surface the order in a
// persistent banner so the cashier knows it's stuck retrying (e.g. printer is
// truly offline / out of paper) rather than silently looping forever.
const FAILURE_BANNER_THRESHOLD = 3;

export const useCashierPrinting = ({
  refreshDashboardData,
  enabled = true,
}: PrintingProps) => {
  const [qzStatus, setQzStatus] = useState<any>({
    connected: true,
    error: null,
  });

  // Per-order consecutive failure counts + the subset that crossed the
  // threshold (kept in state so the banner re-renders).
  const failureCountsRef = useRef<Map<number, number>>(new Map());
  const [stuckPrintOrders, setStuckPrintOrders] = useState<StuckPrintOrder[]>(
    [],
  );

  const errToString = useCallback((err: any) => {
    return typeof err === "string"
      ? err
      : err?.message
        ? String(err.message)
        : String(err || "Unknown native printing error");
  }, []);

  const recordPrintFailure = useCallback(
    (order: any, err: any) => {
      const id = Number(order?.id);
      if (!Number.isFinite(id)) return;
      const attempts = (failureCountsRef.current.get(id) || 0) + 1;
      failureCountsRef.current.set(id, attempts);
      if (attempts < FAILURE_BANNER_THRESHOLD) return;
      const msg = errToString(err);
      setStuckPrintOrders((prev) => {
        const others = prev.filter((o) => o.id !== id);
        return [
          ...others,
          { id, table_number: order?.table_number, attempts, error: msg },
        ];
      });
    },
    [errToString],
  );

  const recordPrintSuccess = useCallback((orderId: number) => {
    const id = Number(orderId);
    failureCountsRef.current.delete(id);
    setStuckPrintOrders((prev) =>
      prev.some((o) => o.id === id) ? prev.filter((o) => o.id !== id) : prev,
    );
  }, []);

  const printingRef = useRef(new Set());
  const pollIntervalRef = useRef<any>(null);
  const isPollingUnprintedRef = useRef(false);
  const qzPollDelayMsRef = useRef(2000);
  const lastQzPollErrorLogAtRef = useRef(0);

  const lastErrorToastAtRef = useRef(0);

  const maybeToastError = useCallback((err: any) => {
    const now = getApproximateServerNow();
    if (now - lastErrorToastAtRef.current < 30000) return;
    lastErrorToastAtRef.current = now;
    const msg =
      typeof err === "string"
        ? err
        : err?.message
          ? String(err.message)
          : String(err || "Unknown native printing error");
    console.error("Tauri Thermal Printer Error Details:", err);
    toast.error(`Thermal printer printing failed: ${msg}`, { duration: 2000 });
    setQzStatus({ connected: false, error: msg });
  }, []);

  const pollUnprintedOrders = useCallback(async () => {
    // Same-window re-entrancy guard. Cross-window de-duplication is intentionally
    // not done here: the auto-print engine runs in every cashier window so a
    // single open window always prints. (Two windows on one PC would print each
    // ticket twice — run one window per PC.) `printingRef` + mark-after-print
    // keep a single window from double-printing or losing a ticket on failure.
    if (isPollingUnprintedRef.current) return;
    isPollingUnprintedRef.current = true;
    try {
      const resp = await api.orders.getUnprinted({ timeout: 30000 });
      const orders = resp?.data?.data?.orders ?? resp?.data?.orders ?? [];
      let printed = false;

      for (const order of orders) {
        if (printingRef.current.has(order.id)) continue;
        printingRef.current.add(order.id);
        try {
          // console.log(`[Tauri Print] Attempting to print order #${order.id}`);

          // printOrderNative owns all copy/station fan-out internally (per-station
          // copies for routed departments, the global copies setting for plain
          // ones). Call it exactly once so copies are never multiplied here.
          await (api.orders as any).printOrderNative(order.id);

          // Mark printed only AFTER the ticket physically printed. If the
          // native print above throws, the order stays unprinted and the next
          // poll re-queues it — so a printer failure never loses a ticket.
          await api.orders.markPrinted(order.id);

          setQzStatus({ connected: true, error: null });
          recordPrintSuccess(order.id);

          const tablePart = order.table_number
            ? ` (Table ${order.table_number})`
            : "";
          toast.success(`🖨️ Order #${tablePart} printed successfully`, {
            duration: 2000,
          });
          printed = true;
        } catch (err) {
          console.error(
            "[Tauri Print] Auto-print failed for order",
            order.id,
            err,
          );
          recordPrintFailure(order, err);
          maybeToastError(err);
        } finally {
          printingRef.current.delete(order.id);
        }
      }
      if (printed) {
        await refreshDashboardData();
      }

      qzPollDelayMsRef.current = 2000;
    } catch (err) {
      const now = getApproximateServerNow();
      if (now - lastQzPollErrorLogAtRef.current > 10000) {
        lastQzPollErrorLogAtRef.current = now;
        console.error("[Tauri Print] Polling error:", err);
      }
      qzPollDelayMsRef.current = Math.min(
        Math.max(qzPollDelayMsRef.current * 2, 4000),
        30000,
      );
    } finally {
      isPollingUnprintedRef.current = false;
    }
  }, [
    maybeToastError,
    refreshDashboardData,
    recordPrintFailure,
    recordPrintSuccess,
  ]);

  const printOrderImmediately = useCallback(
    async (orderId: number) => {
      if (printingRef.current.has(orderId)) return;
      printingRef.current.add(orderId);
      try {
        // printOrderNative owns all copy/station fan-out internally; call it
        // once so copies are never multiplied at this layer.
        await (api.orders as any).printOrderNative(orderId);

        // Mark printed only AFTER the ticket physically printed, so a printer
        // failure leaves the order queued for the background poll to retry.
        await api.orders.markPrinted(orderId);

        setQzStatus({ connected: true, error: null });
        recordPrintSuccess(orderId);
        toast.success(`🖨️ Order printed successfully`, { duration: 1000 });
      } catch (err: any) {
        console.error(
          `[Immediate Tauri Print] Print failed for order #${orderId}:`,
          err,
        );
        recordPrintFailure({ id: orderId }, err);
        maybeToastError(err);
      } finally {
        printingRef.current.delete(orderId);
      }
    },
    [maybeToastError, recordPrintFailure, recordPrintSuccess],
  );

  // Background Polling Effect
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        await pollUnprintedOrders();
      } finally {
        if (cancelled) return;
        const delay = qzPollDelayMsRef.current;
        pollIntervalRef.current = setTimeout(tick, delay);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    };
  }, [pollUnprintedOrders, enabled]);

  // Real-time order stream (WebSocket). While online, the device keeps an
  // active branch-scoped socket to the backend; an order created by a waiter
  // arrives instantly and triggers an immediate refresh + auto-print pass.
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = orderSocket.subscribeNewOrder(async (order) => {
      try {
        // The socket payload carries the full order. The cashier list reads
        // from the local DB, so persist it locally before refreshing —
        // otherwise the refresh re-reads a local table that has no record of
        // the order (e.g. one created on the web waiter app) and shows nothing.
        if (order) {
          await persistServerOrders([order]);
        }
        refreshDashboardData();
        await pollUnprintedOrders();
      } catch (e) {
        // ignore
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pollUnprintedOrders, refreshDashboardData, enabled]);

  // Real-time order updates (WebSocket). When a web cashier confirms or settles
  // an order's payment, the backend pushes the updated order here. The cashier
  // list reads from the local DB, so persist the new paid/partially-paid state
  // before refreshing — otherwise the refresh re-reads a stale local row and the
  // order keeps showing as unpaid until the next pull.
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = orderSocket.subscribeOrderUpdated(async (order) => {
      try {
        if (order) {
          await persistServerOrders([order]);
        }
        refreshDashboardData();
      } catch (e) {
        // ignore
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshDashboardData, enabled]);

  // Diagnostic Printer testing utility
  const testQzPrint = async () => {
    try {
      toast.loading("Sending test print command natively...", {
        id: "tauri-test",
      });
      await (api.orders as any).testPrintNative(getActivePrinterName());
      toast.success(
        `Test print sent to ${getActivePrinterName() || "default printer"}!`,
        { id: "tauri-test" },
      );
      setQzStatus({ connected: true, error: null });
    } catch (err: any) {
      console.error("[Tauri Print Test] Error:", err);
      toast.error(`Test print failed: ${err.message || err}`, {
        id: "tauri-test",
        duration: 2000,
      });
      setQzStatus({ connected: false, error: err.message || String(err) });
    }
  };

  return {
    qzStatus,
    testQzPrint,
    printOrderImmediately,
    pollUnprintedOrders,
    stuckPrintOrders,
    // Manual "retry now" — kicks an immediate print attempt for a stuck order.
    retryStuckPrint: printOrderImmediately,
  };
};
