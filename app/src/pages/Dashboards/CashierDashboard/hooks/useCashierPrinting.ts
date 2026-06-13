import { useState, useEffect, useRef, useCallback } from "react";
import api, { API_BASE_URL } from "@/application";
import toast from "react-hot-toast";
import { getActivePrinterName } from "@/pages/cashier/PrinterSettings";
import { getApproximateServerNow } from "@/shared/utils/serverTime";

interface PrintingProps {
  refreshDashboardData: () => Promise<void>;
}

export const useCashierPrinting = ({ refreshDashboardData }: PrintingProps) => {
  const [qzStatus, setQzStatus] = useState<any>({
    connected: true,
    error: null,
  });
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");

  const printingRef = useRef(new Set());
  const pollIntervalRef = useRef<any>(null);
  const orderStreamRef = useRef<any>(null);
  const isPollingUnprintedRef = useRef(false);
  const qzPollDelayMsRef = useRef(2000);
  const lastQzPollErrorLogAtRef = useRef(0);
  const printLeaderIdRef = useRef(
    `${getApproximateServerNow()}-${Math.random().toString(16).slice(2)}`,
  );

  const lastErrorToastAtRef = useRef(0);

  // const fetchAvailablePrinters = useCallback(async () => {
  //   try {
  //     const { list_thermal_printers } = await import("tauri-plugin-thermal-printer");
  //     const printers = (await list_thermal_printers()) as any;
  //     const printerNames = printers.map((p: any) => 
  //       typeof p === "string" ? p : p.name || p.address || ""
  //     ).filter((p: string) => p.trim() !== "");
  //     setAvailablePrinters(printerNames);
  //     if (printerNames.length > 0 && !selectedPrinter) {
  //       setSelectedPrinter(printerNames[0]);
  //     }
  //   } catch (err) {
  //     console.error("Failed to fetch printers:", err);
  //   }
  // }, [selectedPrinter]);

  const tryAcquirePrintLeadership = useCallback(() => {
    if (typeof window === "undefined") return true;
    const key = "hyper_coffee_leader_v1";
    const now = getApproximateServerNow();
    const ttlMs = 8000;
    const myId = printLeaderIdRef.current;

    try {
      const raw = window.localStorage?.getItem(key);
      const cur = raw ? JSON.parse(raw) : null;
      const curId = cur && typeof cur.id === "string" ? cur.id : "";
      const curExp = cur && typeof cur.exp === "number" ? cur.exp : 0;

      const canTake = !curId || curExp <= now || curId === myId;
      if (!canTake) return false;

      const next = { id: myId, exp: now + ttlMs };
      window.localStorage?.setItem(key, JSON.stringify(next));

      const verifyRaw = window.localStorage?.getItem(key);
      const verify = verifyRaw ? JSON.parse(verifyRaw) : null;
      return verify?.id === myId;
    } catch (e) {
      return true;
    }
  }, []);

  // Print Leadership Management
  useEffect(() => {
    if (typeof window === "undefined") return;
    const renew = () => {
      tryAcquirePrintLeadership();
    };
    renew();
    const t = setInterval(renew, 4000);

    const onUnload = () => {
      try {
        const key = "hyper_print_leader_v1";
        const raw = window.localStorage?.getItem(key);
        const cur = raw ? JSON.parse(raw) : null;
        if (cur?.id === printLeaderIdRef.current) {
          window.localStorage?.removeItem(key);
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener("beforeunload", onUnload);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [tryAcquirePrintLeadership]);

  // Fetch available printers on mount
  // useEffect(() => {
  //   fetchAvailablePrinters();
  // }, [fetchAvailablePrinters]);

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
    toast.error(`Thermal printer printing failed: ${msg}`, { duration: 6000 });
    setQzStatus({ connected: false, error: msg });
  }, []);

  const pollUnprintedOrders = useCallback(async () => {
    if (!tryAcquirePrintLeadership()) return;
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
          // Mark printed before sending to printer so the next poll cannot re-queue it.
          await api.orders.markPrinted(order.id);

          // Respect cashier's configured number of copies
          const copies = (() => {
            try {
              const raw = localStorage.getItem("cashier_print_copies");
              const n = parseInt(raw || "", 10);
              return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 1;
            } catch {
              return 1;
            }
          })();

          for (let i = 0; i < copies; i++) {
            await (api.orders as any).printOrderNative(order.id);
          }
          setQzStatus({ connected: true, error: null });

          const tablePart = order.table_number
            ? ` (Table ${order.table_number})`
            : "";
          toast.success(
            `🖨️ Order # ${tablePart} printed successfully (${copies} copy${copies > 1 ? "ies" : ""})`,
            { duration: 1000 },
          );
          printed = true;
        } catch (err) {
          console.error(
            "[Tauri Print] Auto-print failed for order",
            order.id,
            err,
          );
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
  }, [maybeToastError, refreshDashboardData, tryAcquirePrintLeadership]);

  const printOrderImmediately = useCallback(
    async (orderId: number) => {
      if (printingRef.current.has(orderId)) return;
      printingRef.current.add(orderId);
      try {
        await api.orders.markPrinted(orderId);

        // Respect cashier's configured number of copies
        const copies = (() => {
          try {
            const raw = localStorage.getItem("cashier_print_copies");
            const n = parseInt(raw || "", 10);
            return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 1;
          } catch {
            return 1;
          }
        })();

        for (let i = 0; i < copies; i++) {
          await (api.orders as any).printOrderNative(orderId);
        }
        setQzStatus({ connected: true, error: null });
        toast.success(
          `🖨️ Order printed successfully (${copies} copy${copies > 1 ? "ies" : ""})`,
          { duration: 1000 },
        );
      } catch (err: any) {
        console.error(
          `[Immediate Tauri Print] Print failed for order #${orderId}:`,
          err,
        );
        maybeToastError(err);
      } finally {
        printingRef.current.delete(orderId);
      }
    },
    [maybeToastError],
  );

  // Background Polling Effect
  useEffect(() => {
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
  }, [pollUnprintedOrders]);

  // EventSource SSE Order Stream Listener
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const base = String(API_BASE_URL || "").trim();
      const streamUrl = `${base.replace(/\/+$/, "")}/orders/stream`;
      const src = new EventSource(streamUrl);
      orderStreamRef.current = src;

      src.addEventListener("new_order", async () => {
        try {
          refreshDashboardData();
          await pollUnprintedOrders();
        } catch (e) {
          // ignore
        }
      });

      return () => {
        try {
          src.close();
        } catch (e) {
          // ignore
        }
        orderStreamRef.current = null;
      };
    } catch (e) {
      // ignore
    }
  }, [pollUnprintedOrders, refreshDashboardData]);

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
        duration: 5000,
      });
      setQzStatus({ connected: false, error: err.message || String(err) });
    }
  };

  return {
    qzStatus,
    testQzPrint,
    printOrderImmediately,
    pollUnprintedOrders,
    availablePrinters,
    selectedPrinter,
    setSelectedPrinter,
    // fetchAvailablePrinters,
  };
};
