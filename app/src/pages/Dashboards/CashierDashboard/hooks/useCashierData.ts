import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import api from "@/application";
import { getLocalDb, localDbTables } from "@/db/localDb";
import { isOnline } from "@/infrastructure/api/http-client";
import { syncEngine } from "@/infrastructure/sync/sync-engine";
import { useSyncRefetch } from "@/hooks/useSyncRefetch";
import toast from "react-hot-toast";
import { eq } from "drizzle-orm";

interface DataProps {
  user: any;
  printOrderImmediately: (orderId: number) => Promise<void>;
  pollUnprintedOrders: () => Promise<void>;
}

export const useCashierData = ({ user, printOrderImmediately }: DataProps) => {
  const resolveOrderId = useCallback((entry: any) => {
    const directOrderId = entry?.order_id != null ? entry.order_id : null;
    if (directOrderId != null && directOrderId !== "") return directOrderId;

    const nestedOrderId = entry?.order?.id != null ? entry.order.id : null;
    if (nestedOrderId != null && nestedOrderId !== "") return nestedOrderId;

    const metaOrderId =
      entry?.meta?.orderId != null ? entry.meta.orderId : null;
    if (metaOrderId != null && metaOrderId !== "") return metaOrderId;

    const metaOrderIdAlt =
      entry?.meta?.order_id != null ? entry.meta.order_id : null;
    if (metaOrderIdAlt != null && metaOrderIdAlt !== "") return metaOrderIdAlt;

    const orderLocalId =
      entry?.orderLocalId != null
        ? entry.orderLocalId
        : (entry?.order_local_id ?? null);
    if (orderLocalId != null && String(orderLocalId).trim() !== "") {
      const parsed = String(orderLocalId);
      if (Number.isFinite(parsed)) return parsed;
    }

    const directId = entry?.id != null ? entry.id : null;
    if (directId != null && directId !== "") return directId;

    return null;
  }, []);

  // ── Cancel-order password feature ────────────────────────────────────
  const [requireCancelPassword, setRequireCancelPassword] =
    useState<boolean>(false);
  const [hashedCancelPassword, setHashedCancelPassword] = useState<
    string | null
  >(null);

  // Cashiers must confirm cancellations with the locally cached admin password.
  useEffect(() => {
    if (!user) return;
    setRequireCancelPassword(user.role === "cashier");
  }, [user?.id, user?.role, user?.full_name, user?.username]);

  // Refresh the locally cached admin cancellation hash.
  // The cancel password is configured by the owner on the web side and stored
  // as a branch-level system setting on the backend. When online we pull the
  // latest hash and persist it into the local systemSettings table so cashiers
  // can still validate cancellations offline.
  const refreshAdminHashedPassword = useCallback(async () => {
    try {
      const db = await getLocalDb();

      if (isOnline()) {
        try {
          const response: any = await api.settings.getCurrentUserSettings();
          const settings = response?.data?.data ?? response?.data ?? {};
          const remoteHash = settings?.cancel_password ?? null;
          if (remoteHash) {
            const existing = await db
              .select()
              .from(localDbTables.systemSettings)
              .where(eq(localDbTables.systemSettings.key, "cancel_password"));
            if (existing.length > 0) {
              await db
                .update(localDbTables.systemSettings)
                .set({
                  value: remoteHash,
                  updated_at: new Date().toISOString(),
                })
                .where(eq(localDbTables.systemSettings.key, "cancel_password"));
            } else {
              await db.insert(localDbTables.systemSettings).values({
                key: "cancel_password",
                value: remoteHash,
                updated_at: new Date().toISOString(),
              });
            }
          }
        } catch {
          // Fall back to whatever is cached locally below.
        }
      }

      const settingRows = await db
        .select()
        .from(localDbTables.systemSettings)
        .where(eq(localDbTables.systemSettings.key, "cancel_password"));

      const hp = settingRows[0]?.value || null;
      setHashedCancelPassword(hp);
      return hp;
    } catch {
      setHashedCancelPassword(null);
      return null;
    }
  }, []);

  // ── Dashboard data ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [orderDetailsById, setOrderDetailsById] = useState<any>({});
  const [orderIndex, setOrderIndex] = useState<any>({
    byId: {},
    byRemoteId: {},
    byLocalId: {},
  });
  const [menuMainCategoryById, setMenuMainCategoryById] = useState<any>({});
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [expandedRecentPaymentIds, setExpandedRecentPaymentIds] = useState<any>(
    () => new Set(),
  );
  const [loadingRecentPaymentOrderIds, setLoadingRecentPaymentOrderIds] =
    useState<any>(() => new Set());
  const [processingOrders, setProcessingOrders] = useState<any>(new Set());
  const processingOrdersRef = useRef<any>(new Set());

  const [dashboardData, setDashboardData] = useState<any>({
    pendingPayments: [],
    recentPayments: [],
    ordersForPayment: [],
    paymentsAll: [],
  });

  const [syncStatus, setSyncStatus] = useState({
    online: true,
    syncing: false,
    unsyncedCount: 0,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const refreshDashboardData = useCallback(
    async (opts?: { localOnly?: boolean }) => {
      const localOnly = opts?.localOnly === true;
      try {
        const [pendingResult, paymentsResult, ordersForPaymentResult] =
          (await Promise.allSettled([
            api.payments.getPending(),
            // Only the payments history reconcile hits the network; orders/pending
            // already read from local SQLite. localOnly keeps the whole refresh
            // off the wire so it stays instant.
            api.payments.getAll(undefined, { localOnly }),
            api.orders.getOrdersForPayment(),
          ])) as any[];

        setDashboardData((prev: any) => {
          const pendingPaymentsRaw =
            pendingResult?.status === "fulfilled"
              ? (pendingResult.value?.data?.data?.payments ??
                pendingResult.value?.data?.payments ??
                [])
              : prev.pendingPayments;

          const paymentsAllRaw =
            paymentsResult?.status === "fulfilled"
              ? (paymentsResult.value?.data?.data?.payments ??
                paymentsResult.value?.data?.payments ??
                [])
              : prev.paymentsAll;

          const ordersForPaymentRaw =
            ordersForPaymentResult?.status === "fulfilled"
              ? (ordersForPaymentResult.value?.data?.data?.orders ??
                ordersForPaymentResult.value?.data?.orders ??
                [])
              : prev.ordersForPayment;

          const paymentsAll = Array.isArray(paymentsAllRaw)
            ? paymentsAllRaw
            : [];

          return {
            ...prev,
            pendingPayments: Array.isArray(pendingPaymentsRaw)
              ? pendingPaymentsRaw
              : [],
            recentPayments: paymentsAll.slice(0, 10),
            ordersForPayment: Array.isArray(ordersForPaymentRaw)
              ? ordersForPaymentRaw
              : [],
            paymentsAll,
          };
        });
      } catch (err) {
        // Silently ignore
      }
    },
    [],
  );

  const handleManualSync = async () => {
    if (syncStatus.syncing) return;
    if (!syncStatus.online) {
      toast.error(
        "App is offline. Cannot sync. Please check internet connection.",
      );
      return;
    }
    toast.loading("Synchronizing data...", { id: "manual-sync-progress" });
    const success = await syncEngine.sync();
    toast.dismiss("manual-sync-progress");
    if (success) {
      toast.success("Synchronization completed successfully!");
      refreshDashboardData();
    } else {
      toast.error("Failed to sync. Please try again.");
    }
  };

  const confirmPaymentOnly = async (paymentId: any) => {
    const resp = await api.payments.confirm(paymentId, {
      processed_by: user.id,
    });
    return resp;
  };

  // Load menu items (manual only — no auto-load)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = (await api.menu.getAll()) as any;
        const items =
          resp?.data?.data?.menuItems ?? resp?.data?.menuItems ?? [];
        if (!Array.isArray(items) || items.length === 0) {
          if (cancelled) return;
          setMenuItems([]);
          setMenuMainCategoryById({});
          return;
        }
        if (cancelled) return;

        setMenuItems(items);

        const next = {} as any;
        for (const it of items) {
          const id = it?.id != null ? it.id : null;
          if (id === "") continue;
          const main = String(it?.main_category || "")
            .trim()
            .toLowerCase();
          if (!main) continue;
          next[id as any] = main;
        }
        setMenuMainCategoryById(next);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch missing order details
  useEffect(() => {
    const candidateOrders = [
      ...(Array.isArray(dashboardData.ordersForPayment)
        ? dashboardData.ordersForPayment
        : []),
      ...(Array.isArray(dashboardData.recentPayments)
        ? dashboardData.recentPayments
        : []),
    ];

    const ordersById = new Map<number, any>();
    for (const entry of candidateOrders) {
      const id = resolveOrderId(entry);
      if (id == null) continue;
      ordersById.set(id, entry);
    }

    const missing = Array.from(ordersById.values()).filter((o: any) => {
      const orderId = resolveOrderId(o);
      if (orderId == null) return false;
      const existing = orderDetailsById?.[orderId];
      const hasItems = Array.isArray(o?.items) && o.items.length > 0;
      const existingHasItems =
        Array.isArray(existing?.items) && existing.items.length > 0;
      return !hasItems && !existingHasItems;
    });

    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      const results = (await Promise.allSettled(
        missing
          .map((o: any) => resolveOrderId(o))
          .filter((id: number | null): id is number => id != null)
          .map((id: number) => api.orders.getById(id) as any),
      )) as any[];

      if (cancelled) return;

      setOrderDetailsById((prev: any) => {
        const next = { ...(prev || {}) } as any;
        for (const r of results) {
          if (r.status !== "fulfilled") continue;
          const order = r.value?.data?.data?.order ?? r.value?.data?.order;
          const orderId = resolveOrderId(order);
          if (orderId == null) continue;
          next[orderId] = order;
        }
        // rebuild index
        try {
          const byId: any = {};
          const byRemoteId: any = {};
          const byLocalId: any = {};
          for (const v of Object.values(next)) {
            const o: any = v || {};
            if (o?.id != null) byId[o.id] = o;
            if (o?.remote_id != null) byRemoteId[o.remote_id] = o;
            if (o?.localId != null) byLocalId[String(o.localId)] = o;
            if (o?.order_local_id != null)
              byLocalId[String(o.order_local_id)] = o;
          }
          setOrderIndex({ byId, byRemoteId, byLocalId });
        } catch (e) {
          // ignore
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    dashboardData.ordersForPayment,
    dashboardData.recentPayments,
    orderDetailsById,
    resolveOrderId,
  ]);

  // Modal states
  const [showProcessPaymentModal, setShowProcessPaymentModal] = useState(false);
  const [showGenerateQRModal, setShowGenerateQRModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isBlockingPaymentUi, setIsBlockingPaymentUi] = useState(false);
  const [showConfirmProcessPaymentModal, setShowConfirmProcessPaymentModal] =
    useState(false);
  const [showProcessPaymentConfirmModal, setShowProcessPaymentConfirmModal] =
    useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [confirmOrder, setConfirmOrder] = useState<any>(null);
  const [confirmProcessPaymentOrder, setConfirmProcessPaymentOrder] =
    useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [qrCode, setQrCode] = useState<any>(null);

  const [profileData, setProfileData] = useState<any>({
    full_name: user?.full_name || "",
    phone: "",
    address: "",
  });

  // Fetch dashboard data on mount.
  // Render from local SQLite first so the screen is usable immediately, then
  // reconcile with the backend in the background. Previously the skeleton was
  // gated on the full remote payment-history pull, which could take many
  // seconds on tills with a large history (only-skeleton-shows symptom).
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        await refreshDashboardData({ localOnly: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
      // Background reconcile — does not block the UI.
      void refreshDashboardData();
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshDashboardData]);

  // Refresh once background hydration / reconnect / manual sync completes.
  useSyncRefetch(() => {
    refreshDashboardData();
  });

  // Auto-refresh on two cadences so the on-screen lists stay live without
  // hammering the backend:
  //  • every 10 min — cheap local-only refresh (reads SQLite, no network).
  //  • every 1 hour — full remote reconcile (pulls the recent payment window).
  // Previously the full reconcile ran every 5 s, re-pulling and re-upserting
  // the payment history on every tick.
  useEffect(() => {
    const lightInterval = setInterval(() => {
      refreshDashboardData({ localOnly: true });
    }, 600000);
    const fullInterval = setInterval(() => {
      refreshDashboardData();
    }, 3600000);

    return () => {
      clearInterval(lightInterval);
      clearInterval(fullInterval);
    };
  }, [refreshDashboardData]);

  const handleConfirmProcessPaymentYes = async (
    orderArg: any,
    paymentMethodOverride?: string,
  ) => {
    const order = orderArg || confirmOrder;
    if (!order) return;

    if (
      processingOrders.has(order.id) ||
      processingOrdersRef.current.has(order.id)
    )
      return;

    processingOrdersRef.current.add(order.id);
    flushSync(() => setIsBlockingPaymentUi(true));

    try {
      setProcessingOrders((prev: any) => new Set(prev).add(order.id));

      setDashboardData((prev: any) => ({
        ...prev,
        ordersForPayment: prev.ordersForPayment.filter(
          (o: any) => o.id !== order.id,
        ),
      }));

      const paymentData = {
        order_id: order.id,
        amount: order.total_amount,
        payment_method: paymentMethodOverride || paymentMethod || "cash",
        status: "paid",
        processed_by: user.id,
      };

      const createResp = (await api.payments.create(paymentData)) as any;
      const createdPayment = createResp?.data?.data?.payment;
      if (createdPayment?.id) {
        const confirmResp = await confirmPaymentOnly(createdPayment.id);
        const confirmedPayment =
          confirmResp?.data?.data?.payment ??
          confirmResp?.data?.payment ??
          null;

        if (confirmedPayment?.id) {
          setDashboardData((prev: any) => {
            const nextRecent = [
              confirmedPayment,
              ...(prev.recentPayments || []),
            ]
              .filter((p) => p && p.id != null)
              .slice(0, 10);
            const nextAll = [
              confirmedPayment,
              ...(prev.paymentsAll || []),
            ].filter((p) => p && p.id != null);
            return {
              ...prev,
              recentPayments: nextRecent,
              paymentsAll: nextAll,
            };
          });
        }
      }

      toast.success("Payment confirmed successfully!");
      setShowProcessPaymentConfirmModal(false);
      setConfirmOrder(null);
      refreshDashboardData();
      syncEngine.notifyListeners();
    } catch (error: any) {
      console.error("Error confirming payment:", error);

      if (
        error.response?.status === 400 &&
        error.response?.data?.message?.includes("already exists")
      ) {
        toast.error("Payment already created for this order");
      } else {
        toast.error("Failed to confirm payment");
      }

      refreshDashboardData();
    } finally {
      setIsBlockingPaymentUi(false);
      processingOrdersRef.current.delete(order.id);
      setProcessingOrders((prev: any) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const handleConfirmProcessPaymentNo = async (orderArg?: any) => {
    const order = orderArg || confirmOrder;
    if (!order) return;

    if (
      processingOrders.has(order.id) ||
      processingOrdersRef.current.has(order.id)
    )
      return;

    processingOrdersRef.current.add(order.id);
    flushSync(() => setIsBlockingPaymentUi(true));

    try {
      setProcessingOrders((prev: any) => new Set(prev).add(order.id));

      setDashboardData((prev: any) => ({
        ...prev,
        ordersForPayment: prev.ordersForPayment.filter(
          (o: any) => o.id !== order.id,
        ),
      }));

      await api.orders.updateStatus(order.id, { status: "cancelled" });
      const deletedResp = (await api.payments.create({
        order_id: order.id,
        amount: order.total_amount,
        payment_method: "cash",
        status: "deleted",
        processed_by: user.id,
      })) as any;

      const deletedPayment =
        deletedResp?.data?.data?.payment ?? deletedResp?.data?.payment ?? null;

      if (deletedPayment?.id) {
        setDashboardData((prev: any) => {
          const nextRecent = [deletedPayment, ...(prev.recentPayments || [])]
            .filter((p) => p && p.id != null)
            .slice(0, 10);
          const nextAll = [deletedPayment, ...(prev.paymentsAll || [])].filter(
            (p) => p && p.id != null,
          );
          return { ...prev, recentPayments: nextRecent, paymentsAll: nextAll };
        });
      }

      toast.success("Order cancelled");
      setShowProcessPaymentConfirmModal(false);
      // The order stays in confirmOrder so it survives the modal-to-password transition
      setConfirmOrder(null);
      refreshDashboardData();
      syncEngine.notifyListeners();
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
      refreshDashboardData();
    } finally {
      setIsBlockingPaymentUi(false);
      processingOrdersRef.current.delete(order.id);
      setProcessingOrders((prev: any) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const openCancelOrderConfirm = (order: any) => {
    if (!order) return;
    setConfirmOrder(order);
    void refreshAdminHashedPassword();
    setShowProcessPaymentConfirmModal(true);
  };

  const onConfirmCancelAdminPassword = () => {
    void refreshAdminHashedPassword();
    setShowProcessPaymentConfirmModal(true); // re-open the order body
  };

  const openProcessPaymentConfirm = (order: any) => {
    if (!order) return;
    if (isBlockingPaymentUi) return;
    if (
      processingOrders.has(order.id) ||
      processingOrdersRef.current.has(order.id)
    )
      return;
    setConfirmProcessPaymentOrder(order);
    setShowConfirmProcessPaymentModal(true);
  };

  const toggleRecentPaymentDetails = async (payment: any) => {
    const paymentId = payment?.id;
    if (!paymentId) return;

    const orderId = resolveOrderId(payment);
    const orderIdKey = orderId != null ? String(orderId) : null;

    setExpandedRecentPaymentIds((prev: any) => {
      const next = new Set(prev || []);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });

    if (orderId == null) return;
    const existing = orderDetailsById?.[orderId as any];
    if (existing) return;

    if (orderIdKey && loadingRecentPaymentOrderIds.has(orderIdKey)) return;

    setLoadingRecentPaymentOrderIds((prev: any) => {
      const next = new Set(prev || []);
      if (orderIdKey) next.add(orderIdKey);
      return next;
    });

    try {
      const resp = (await api.orders.getById(orderId as any)) as any;
      const order = resp?.data?.data?.order ?? resp?.data?.order;
      const normalizedOrderId = resolveOrderId(order);
      if (normalizedOrderId != null) {
        setOrderDetailsById((prev: any) => {
          const next = { ...(prev || {}), [normalizedOrderId]: order } as any;
          try {
            const byId: any = {};
            const byRemoteId: any = {};
            const byLocalId: any = {};
            for (const v of Object.values(next)) {
              const o: any = v || {};
              if (o?.id != null) byId[o.id] = o;
              if (o?.remote_id != null) byRemoteId[o.remote_id] = o;
              if (o?.localId != null) byLocalId[String(o.localId)] = o;
              if (o?.order_local_id != null)
                byLocalId[String(o.order_local_id)] = o;
            }
            setOrderIndex({ byId, byRemoteId, byLocalId });
          } catch (e) {
            // ignore
          }
          return next;
        });
      }
    } catch (e) {
    } finally {
      setLoadingRecentPaymentOrderIds((prev: any) => {
        const next = new Set(prev || []);
        if (orderIdKey) next.delete(orderIdKey);
        return next;
      });
    }
  };

  const processPaymentWithMethod = async () => {
    if (!selectedOrder) return;

    // Re-entrancy guard: a double-click on "Process payment" would otherwise
    // fire api.payments.create twice and leave duplicate payments on the order.
    // The ref flips synchronously so a second click in the same tick is dropped
    // before any request goes out (mirrors handleConfirmProcessPaymentYes).
    if (
      processingOrders.has(selectedOrder.id) ||
      processingOrdersRef.current.has(selectedOrder.id)
    )
      return;
    processingOrdersRef.current.add(selectedOrder.id);
    setProcessingOrders((prev: any) => new Set(prev).add(selectedOrder.id));

    try {
      const paymentData = {
        order_id: selectedOrder.id,
        amount: selectedOrder.total_amount,
        payment_method: paymentMethod,
        status: paymentMethod === "cash" ? "paid" : "pending",
        processed_by: user.id,
      };

      if (paymentMethod === "qr_code") {
        const response = (await api.payments.createWithQR(paymentData)) as any;
        setQrCode(response.data.data.qr_code);
        toast.success("QR payment created! Show QR code to customer.");
      } else {
        const createResp = (await api.payments.create(paymentData)) as any;
        const createdPayment = createResp?.data?.data?.payment;
        if (createdPayment?.id) {
          await confirmPaymentOnly(createdPayment.id);
          printOrderImmediately(selectedOrder.id);
        }
        toast.success("Cash payment processed successfully!");
        setShowProcessPaymentModal(false);
      }

      await refreshDashboardData();
      syncEngine.notifyListeners();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      processingOrdersRef.current.delete(selectedOrder.id);
      setProcessingOrders((prev: any) => {
        const next = new Set(prev);
        next.delete(selectedOrder.id);
        return next;
      });
    }
  };

  const updateProfile = async () => {
    if (!syncStatus.online || !isOnline()) {
      toast.error(
        "Profile updates are disabled when the application is offline.",
      );
      return;
    }
    try {
      await api.auth.updateProfile(user.id, profileData);
      toast.success("Profile updated successfully!");
      setShowProfileModal(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.");
    }
  };

  const confirmCashPayment = (order: any, selectedPaymentMethod?: string) => {
    if (!order) return;
    if (isBlockingPaymentUi) return;
    if (
      processingOrders.has(order.id) ||
      processingOrdersRef.current.has(order.id)
    )
      return;

    flushSync(() => setIsBlockingPaymentUi(true));
    setShowConfirmProcessPaymentModal(false);
    setConfirmProcessPaymentOrder(null);
    handleConfirmProcessPaymentYes(order, selectedPaymentMethod);
  };

  const ordersForPaymentSorted = useMemo(() => {
    const list = Array.isArray(dashboardData.ordersForPayment)
      ? dashboardData.ordersForPayment
      : [];
    return list.slice().sort((a: any, b: any) => {
      const ad = new Date(a?.created_at || a?.updated_at);
      const bd = new Date(b?.created_at || b?.updated_at);
      const at = Number.isNaN(ad.getTime()) ? null : ad.getTime();
      const bt = Number.isNaN(bd.getTime()) ? null : bd.getTime();
      if (at != null && bt != null) return bt - at;
      if (at != null) return -1;
      if (bt != null) return 1;
      return (b?.id || 0) - (a?.id || 0);
    });
  }, [dashboardData.ordersForPayment]);

  return {
    loading,
    dashboardData,
    syncStatus,
    orderDetailsById,
    setOrderDetailsById,
    expandedRecentPaymentIds,
    loadingRecentPaymentOrderIds,
    processingOrders,
    isBlockingPaymentUi,
    setIsBlockingPaymentUi,
    showProcessPaymentModal,
    setShowProcessPaymentModal,
    showGenerateQRModal,
    setShowGenerateQRModal,
    showReportsModal,
    setShowReportsModal,
    showProfileModal,
    setShowProfileModal,
    showConfirmProcessPaymentModal,
    setShowConfirmProcessPaymentModal,
    showProcessPaymentConfirmModal,
    setShowProcessPaymentConfirmModal,
    selectedOrder,
    setSelectedOrder,
    confirmOrder,
    setConfirmOrder,
    confirmProcessPaymentOrder,
    setConfirmProcessPaymentOrder,
    paymentMethod,
    setPaymentMethod,
    qrCode,
    setQrCode,
    profileData,
    setProfileData,
    menuItems,
    menuMainCategoryById,
    handleManualSync,
    refreshDashboardData,
    handleConfirmProcessPaymentYes,
    handleConfirmProcessPaymentNo,
    openCancelOrderConfirm,
    openProcessPaymentConfirm,
    toggleRecentPaymentDetails,
    processPaymentWithMethod,
    updateProfile,
    confirmCashPayment,
    ordersForPaymentSorted,
    // ── Cancel-password props ───────────────────────────────────────────────
    requireCancelPassword,
    setRequireCancelPassword,
    hashedCancelPassword,
    refreshAdminHashedPassword,
    onConfirmCancelAdminPassword,
    orderIndex,
  };
};
