import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { eq } from "drizzle-orm";
import api from "@/application";
import { getLocalDb, localDbTables } from "@/db/localDb";
import { useAuth } from "@/context/AuthContext";
import { getApproximateServerDate } from "@/shared/utils/serverTime";

export const useCashierEmployeesData = () => {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  const [statsRange, setStatsRange] = useState("today");
  const [employeeOrders, setEmployeeOrders] = useState<any[]>([]);
  const [employeeStats, setEmployeeStats] = useState({
    ordersCreated: 0,
    ordersServed: 0,
    totalRevenue: 0,
    pendingBalance: 0,
  });

  const [ordersForPayment, setOrdersForPayment] = useState<any[]>([]);
  const [orderDetailsById, setOrderDetailsById] = useState<{
    [key: string]: any;
  }>({});
  const [loadingOrderIds, setLoadingOrderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const fetchedOrderIdsRef = useRef<Set<string>>(new Set());
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(
    new Set(),
  );

  const [showProcessPaymentConfirmModal, setShowProcessPaymentConfirmModal] =
    useState(false);
  const [confirmProcessPaymentOrder, setConfirmProcessPaymentOrder] =
    useState<any>(null);

  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<any>(null);

  // Selected payment method for the shared ConfirmCashPaymentModal.
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Settle-all (batch) state.
  const [showSettleAllModal, setShowSettleAllModal] = useState(false);
  const [settlingAll, setSettlingAll] = useState(false);
  const [settleAllProgress, setSettleAllProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  // Admin cancel-order password gate (mirrors the cashier dashboard).
  const [requireCancelPassword, setRequireCancelPassword] = useState(false);
  const [adminHashedPassword, setAdminHashedPassword] = useState<string | null>(
    null,
  );

  // Cashiers must confirm cancellations with the locally cached admin password.
  useEffect(() => {
    if (!user) return;
    setRequireCancelPassword(user.role === "cashier");
  }, [user?.id, user?.role]);

  const refreshAdminHashedPassword = useCallback(async () => {
    try {
      const db = await getLocalDb();
      const adminRows = await db
        .select({ raw_json: localDbTables.users.raw_json })
        .from(localDbTables.users)
        .where(eq(localDbTables.users.role, "admin"));
      const admins = adminRows.map((row: any) => JSON.parse(row.raw_json));
      const adminWithPassword = admins.find((entry: any) =>
        Boolean(entry?.cancel_password),
      );
      const hp = adminWithPassword?.cancel_password || null;
      setAdminHashedPassword(hp);
      return hp;
    } catch {
      setAdminHashedPassword(null);
      return null;
    }
  }, []);

  const normalizeStatus = useCallback(
    (s: any) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .trim(),
    [],
  );

  const selectedEmployee = useMemo(() => {
    const id = selectedEmployeeId ? selectedEmployeeId : null;
    if (id === null || id === "") return null;
    return employees.find((e) => e.id === id) || null;
  }, [employees, selectedEmployeeId]);

  const ordersForPaymentSorted = useMemo(() => {
    const list = Array.isArray(ordersForPayment) ? ordersForPayment : [];
    const filteredByTable = list.filter((o) => {
      if (!tableFilter) return true;
      return String(o?.table_number || "")
        .toLowerCase()
        .includes(tableFilter.toLowerCase());
    });

    return filteredByTable.slice().sort((a, b) => {
      const ad = new Date(a?.created_at || a?.updated_at);
      const bd = new Date(b?.created_at || b?.updated_at);
      const at = Number.isNaN(ad.getTime()) ? null : ad.getTime();
      const bt = Number.isNaN(bd.getTime()) ? null : bd.getTime();
      if (at !== null && bt !== null) return bt - at;
      if (at !== null) return -1;
      if (bt !== null) return 1;
      const aid = a?.id != null ? a.id : 0;
      const bid = b?.id != null ? b.id : 0;
      return bid - aid;
    });
  }, [ordersForPayment, tableFilter]);

  const fetchEmployees = async () => {
    const res = await api.users.getWaiters();
    const list =
      (res as any)?.data?.data?.users ??
      (res as any)?.data?.users ??
      (res as any)?.data?.waiters ??
      [];
    const arr = Array.isArray(list) ? list : [];
    const normalized = arr.map((u: any) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name || u.name || u.username,
      role: u.role,
      is_active: u.is_active !== false,
    }));
    setEmployees(normalized);
  };

  const fetchEmployeeData = useCallback(async (employeeId: string) => {
    const [ordersForPaymentResp, allOrdersResp] = await Promise.allSettled([
      api.orders.getOrdersForPayment({ employee_id: employeeId }),
      api.orders.getAll({ type: "cafe", employee_id: employeeId }),
    ]);

    const ordersForPaymentRaw =
      ordersForPaymentResp?.status === "fulfilled"
        ? ((ordersForPaymentResp.value as any)?.data?.data?.orders ??
          (ordersForPaymentResp.value as any)?.data?.orders ??
          [])
        : [];
    setOrdersForPayment(
      Array.isArray(ordersForPaymentRaw) ? ordersForPaymentRaw : [],
    );

    const allOrdersRaw =
      allOrdersResp?.status === "fulfilled"
        ? ((allOrdersResp.value as any)?.data?.data?.orders ??
          (allOrdersResp.value as any)?.data?.orders ??
          (allOrdersResp.value as any)?.data?.data ??
          [])
        : [];
    setEmployeeOrders(Array.isArray(allOrdersRaw) ? allOrdersRaw : []);
  }, []);

  const getOrderItemsForRow = useCallback(
    (order: any) => {
      if (!order) return [];
      const id = order?.id != null ? order.id : null;
      const fromCache =
        id !== null && id !== null && id !== undefined && id !== ""
          ? orderDetailsById?.[id]?.items
          : null;
      const items = fromCache ?? order?.items;
      return Array.isArray(items) ? items : [];
    },
    [orderDetailsById],
  );

  // Load missing order details
  useEffect(() => {
    const list = Array.isArray(ordersForPayment) ? ordersForPayment : [];
    const missing = list
      .map((o) => (o?.id != null ? o.id : null))
      .filter((id): id is string => id !== null && id !== "")
      .filter((id) => {
        if (fetchedOrderIdsRef.current.has(id)) return false;
        if (loadingOrderIds.has(id)) return false;
        const existing = orderDetailsById?.[id];
        if (
          existing &&
          Array.isArray(existing.items) &&
          existing.items.length > 0
        )
          return false;
        const order = list.find((x) => x?.id === id);
        const items = Array.isArray(order?.items) ? order.items : [];
        return items.length === 0;
      });

    if (missing.length === 0) return;

    missing.forEach((id) => {
      setLoadingOrderIds((prev) => {
        const next = new Set(prev || []);
        next.add(id);
        return next;
      });

      api.orders
        .getById(id)
        .then((resp) => {
          const order =
            (resp as any)?.data?.data?.order ?? (resp as any)?.data?.order;
          if (order?.id == null) return;
          const oid = order.id;
          if (oid === "") return;
          setOrderDetailsById((prev) => ({ ...(prev || {}), [oid]: order }));
          fetchedOrderIdsRef.current.add(oid);
        })
        .catch(() => {
          fetchedOrderIdsRef.current.add(id);
        })
        .finally(() => {
          setLoadingOrderIds((prev) => {
            const next = new Set(prev || []);
            next.delete(id);
            return next;
          });
        });
    });
  }, [ordersForPayment, loadingOrderIds, orderDetailsById]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await fetchEmployees();
      } catch (e) {
        console.error("Cashier employees load error:", e);
        toast.error("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Handle employee view switch
  useEffect(() => {
    const loadEmployeeView = async () => {
      const id = selectedEmployeeId ? selectedEmployeeId : null;
      if (id === null || id === "") {
        setOrdersForPayment([]);
        setEmployeeOrders([]);
        return;
      }

      try {
        setLoading(true);
        await fetchEmployeeData(id);
      } catch (e) {
        console.error("Cashier employee data error:", e);
        toast.error("Failed to load employee payments");
      } finally {
        setLoading(false);
      }
    };
    loadEmployeeView();
  }, [selectedEmployeeId, fetchEmployeeData]);

  // Calculate employee stats dynamically
  useEffect(() => {
    const orders = Array.isArray(employeeOrders) ? employeeOrders : [];

    const now = getApproximateServerDate();
    let from: Date | null = null;
    let to: Date | null = null;

    if (statsRange === "today") {
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
    } else if (statsRange === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      to = new Date(
        y.getFullYear(),
        y.getMonth(),
        y.getDate(),
        23,
        59,
        59,
        999,
      );
    } else if (statsRange === "week") {
      from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
    } else if (statsRange === "month") {
      from = new Date(now);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
    }

    const rangeOrders =
      from && to
        ? orders.filter((o) => {
            const d = new Date(o.created_at);
            if (Number.isNaN(d.getTime())) return false;
            return d >= from! && d <= to!;
          })
        : orders;

    const served = rangeOrders.filter((o) => {
      const st = normalizeStatus(o.status);
      const pst = normalizeStatus(o.payment_status);
      return ["completed", "paid"].includes(st) || pst === "paid";
    });
    const revenue = served.reduce(
      (sum, o) => sum + (parseFloat(o.total_amount) || 0),
      0,
    );

    const pendingBalance = rangeOrders
      .filter((o) => {
        const st = normalizeStatus(o.status);
        const pst = normalizeStatus(o.payment_status);
        const isCanceled =
          st === "deleted" || st === "cancelled" || st === "canceled";
        const isPaid = pst === "paid" || st === "paid" || st === "completed";
        return !isCanceled && !isPaid;
      })
      .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

    setEmployeeStats({
      ordersCreated: rangeOrders.length,
      ordersServed: served.length,
      totalRevenue: revenue,
      pendingBalance,
    });
  }, [statsRange, employeeOrders, normalizeStatus]);

  // Auto-refresh employee details
  useEffect(() => {
    const id = selectedEmployeeId ? selectedEmployeeId : null;
    if (id === null || id === "") return;

    const refreshInterval = setInterval(() => {
      fetchEmployeeData(id).catch((err) => {
        console.error("Auto-refresh error:", err);
      });
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [selectedEmployeeId, fetchEmployeeData]);

  const openProcessPaymentConfirm = (order: any) => {
    if (!order) return;
    if (processingOrders.has(order.id)) return;
    setConfirmProcessPaymentOrder(order);
    setShowProcessPaymentConfirmModal(true);
  };

  const handleProcessPaymentNo = () => {
    setShowProcessPaymentConfirmModal(false);
    setConfirmProcessPaymentOrder(null);
  };

  const handleProcessPayment = useCallback(
    async (order: any, methodOverride?: string) => {
      if (processingOrders.has(order.id)) return;

      const method = methodOverride || paymentMethod || "cash";

      try {
        setProcessingOrders((prev) => {
          const next = new Set(prev);
          next.add(order.id);
          return next;
        });

        setOrdersForPayment((prev) => prev.filter((o) => o.id !== order.id));

        const paymentData = {
          order_id: order.id,
          amount: order.total_amount,
          payment_method: method,
          status: method === "cash" ? "paid" : "pending",
          processed_by: user.id,
        };

        const createResp = await api.payments.create(paymentData);
        const createdPayment = (createResp as any)?.data?.data?.payment;
        if (createdPayment?.id) {
          await api.payments.confirm(createdPayment.id, {
            processed_by: user.id,
          });
        }

        toast.success("Payment confirmed");
        if (selectedEmployeeId) {
          await fetchEmployeeData(selectedEmployeeId);
        }
      } catch (e: any) {
        console.error("Create payment error:", e);
        if (
          e.response?.status === 400 &&
          e.response?.data?.message?.includes("already exists")
        ) {
          toast.error("Payment already created for this order");
          if (selectedEmployeeId) {
            await fetchEmployeeData(selectedEmployeeId);
          }
        } else {
          toast.error("Failed to create payment record");
          if (selectedEmployeeId) {
            await fetchEmployeeData(selectedEmployeeId);
          }
        }
      } finally {
        setProcessingOrders((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }
    },
    [
      user.id,
      selectedEmployeeId,
      fetchEmployeeData,
      processingOrders,
      paymentMethod,
    ],
  );

  const handleProcessPaymentYes = async () => {
    const order = confirmProcessPaymentOrder;
    if (!order) return;

    setShowProcessPaymentConfirmModal(false);
    setConfirmProcessPaymentOrder(null);
    await handleProcessPayment(order, paymentMethod);
  };

  // Combined amount of every invoice currently waiting for payment.
  const pendingSettleTotal = useMemo(
    () =>
      ordersForPaymentSorted.reduce(
        (sum, o) => sum + (parseFloat(o.total_amount) || 0),
        0,
      ),
    [ordersForPaymentSorted],
  );

  const openSettleAllConfirm = () => {
    if (ordersForPaymentSorted.length === 0 || settlingAll) return;
    setShowSettleAllModal(true);
  };

  const handleSettleAllNo = () => {
    if (settlingAll) return;
    setShowSettleAllModal(false);
  };

  // Confirm every pending invoice for the selected waiter, one after another.
  const handleSettleAll = useCallback(async () => {
    if (settlingAll) return;
    // Snapshot so the list can shrink underneath us as each one clears.
    const orders = ordersForPaymentSorted.filter(
      (o) => !processingOrders.has(o.id),
    );
    if (orders.length === 0) return;

    const method = paymentMethod || "cash";
    setSettlingAll(true);
    setSettleAllProgress({ done: 0, total: orders.length });
    let ok = 0;
    let fail = 0;

    // Sequential — avoids hammering the backend and racing the auto-refresh.
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      try {
        setOrdersForPayment((prev) => prev.filter((o) => o.id !== order.id));

        const createResp = await api.payments.create({
          order_id: order.id,
          amount: order.total_amount,
          payment_method: method,
          status: method === "cash" ? "paid" : "pending",
          processed_by: user.id,
        });
        const createdPayment = (createResp as any)?.data?.data?.payment;
        if (createdPayment?.id) {
          await api.payments.confirm(createdPayment.id, {
            processed_by: user.id,
          });
        }
        ok += 1;
      } catch (e: any) {
        // A pre-existing payment isn't a real failure for a bulk settle.
        if (
          e?.response?.status === 400 &&
          e?.response?.data?.message?.includes("already exists")
        ) {
          ok += 1;
        } else {
          console.error("Settle-all error:", e);
          fail += 1;
        }
      } finally {
        setSettleAllProgress({ done: i + 1, total: orders.length });
      }
    }

    setSettlingAll(false);
    setShowSettleAllModal(false);
    setSettleAllProgress(null);

    if (fail === 0) toast.success(`Settled ${ok} payment${ok === 1 ? "" : "s"}`);
    else if (ok === 0)
      toast.error(`Failed to settle ${fail} payment${fail === 1 ? "" : "s"}`);
    else toast(`Settled ${ok}, ${fail} failed`);

    if (selectedEmployeeId) {
      await fetchEmployeeData(selectedEmployeeId).catch(() => {});
    }
  }, [
    settlingAll,
    ordersForPaymentSorted,
    processingOrders,
    paymentMethod,
    user.id,
    selectedEmployeeId,
    fetchEmployeeData,
  ]);

  const openCancelConfirm = (order: any) => {
    if (!order) return;
    setConfirmOrder(order);
    void refreshAdminHashedPassword();
    setShowCancelConfirmModal(true);
  };

  const handleCancelNo = () => {
    setShowCancelConfirmModal(false);
    setConfirmOrder(null);
  };

  const handleCancelYes = async () => {
    const order = confirmOrder;
    if (!order) return;

    if (processingOrders.has(order.id)) return;

    try {
      setProcessingOrders((prev) => {
        const next = new Set(prev);
        next.add(order.id);
        return next;
      });

      setOrdersForPayment((prev) => prev.filter((o) => o.id !== order.id));

      await api.orders.updateStatus(order.id, { status: "cancelled" });
      await api.payments.create({
        order_id: order.id,
        amount: order.total_amount,
        payment_method: "cash",
        status: "cancelled",
        processed_by: user.id,
      });

      toast.success("Order cancelled");
      setShowCancelConfirmModal(false);
      setConfirmOrder(null);
      if (selectedEmployeeId) {
        await fetchEmployeeData(selectedEmployeeId);
      }
    } catch (e) {
      console.error("Cancel order error:", e);
      toast.error("Failed to cancel order");
      if (selectedEmployeeId) {
        await fetchEmployeeData(selectedEmployeeId);
      }
    } finally {
      setProcessingOrders((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const formatOrderItemsPreview = useCallback((items: any[]) => {
    const arr = Array.isArray(items) ? items : [];
    if (arr.length === 0) return "";
    const parts = arr
      .slice(0, 3)
      .map((it) => {
        const qty = parseInt(it.quantity, 10);
        const name = it.menu_item_name || it.name || "";
        if (!name) return null;
        return `${Number.isFinite(qty) ? qty : 1}x ${name}`;
      })
      .filter(Boolean);
    if (parts.length === 0) return "";
    const remaining = arr.length - 3;
    return remaining > 0
      ? `${parts.join(", ")} +${remaining} more`
      : parts.join(", ");
  }, []);

  const formatCurrency = useCallback((val: any) => {
    const n = parseFloat(val);
    const safe = Number.isFinite(n) ? n : 0;
    return `${safe.toLocaleString()} Birr`;
  }, []);

  return {
    loading,
    employees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    tableFilter,
    setTableFilter,
    statsRange,
    setStatsRange,
    employeeOrders,
    employeeStats,
    ordersForPaymentSorted,
    orderDetailsById,
    loadingOrderIds,
    processingOrders,
    showProcessPaymentConfirmModal,
    confirmProcessPaymentOrder,
    showCancelConfirmModal,
    confirmOrder,
    selectedEmployee,
    paymentMethod,
    setPaymentMethod,
    requireCancelPassword,
    adminHashedPassword,
    normalizeStatus,
    getOrderItemsForRow,
    openProcessPaymentConfirm,
    handleProcessPaymentNo,
    handleProcessPaymentYes,
    handleProcessPayment,
    pendingSettleTotal,
    showSettleAllModal,
    settlingAll,
    settleAllProgress,
    openSettleAllConfirm,
    handleSettleAllNo,
    handleSettleAll,
    openCancelConfirm,
    handleCancelNo,
    handleCancelYes,
    formatOrderItemsPreview,
    formatCurrency,
  };
};
