import { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/application";
import toast from "react-hot-toast";
import { getApproximateServerDateString } from "@/shared/utils/serverTime";
import { PaymentRecord, PendingOrderRecord } from "../types";

const PAGE_SIZE = 25;

export const usePaymentData = () => {
  const [loading, setLoading] = useState(true);
  // Full windowed set used only for the aggregate stat cards.
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  // Single backend page rendered by the table (status !== 'pending').
  const [pagePayments, setPagePayments] = useState<PaymentRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [ordersForPayment, setOrdersForPayment] = useState<
    PendingOrderRecord[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPayment, setViewPayment] = useState<any>(null);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Aux data for the stat cards + filters. Loaded once; not paginated because
  // the stat cards aggregate over the whole window.
  const fetchAux = useCallback(async () => {
    try {
      const [pr, or, pm] = await Promise.all([
        api.payments.getAll(),
        api.orders.getOrdersForPayment(),
        api.settings.getPaymentMethods(),
      ]);
      setPayments(
        (pr as any)?.data?.data?.payments ?? (pr as any)?.data?.payments ?? [],
      );
      setOrdersForPayment(
        (or as any)?.data?.data?.orders ?? (or as any)?.data?.orders ?? [],
      );
      const methodsList =
        (pm as any)?.data?.data?.payment_methods ??
        (pm as any)?.data?.payment_methods ??
        [];
      setPaymentMethods(Array.isArray(methodsList) ? methodsList : []);
    } catch {
      toast.error("Failed to load payments");
    }
  }, []);

  useEffect(() => {
    fetchAux();
  }, [fetchAux]);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to the first page whenever the result set changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus, filterMethod]);

  // Fetch one backend page for the table. The 'pending' filter shows orders
  // awaiting payment (a separate, bounded list) and is sliced locally below.
  const fetchPage = useCallback(async () => {
    if (filterStatus === "pending") {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params: any = { page, limit: PAGE_SIZE };
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterMethod !== "all") params.payment_method = filterMethod;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.payments.getHistory(params);
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? {};
      setPagePayments(Array.isArray(data.payments) ? data.payments : []);
      setServerTotal(Number(data.count ?? 0));
    } catch {
      toast.error("Failed to load payments");
      setPagePayments([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterMethod, debouncedSearch]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // The 'pending' branch maps orders awaiting payment and is paginated locally.
  const pendingRows = useMemo(() => {
    if (filterStatus !== "pending") return [];
    return ordersForPayment
      .filter((o) => !debouncedSearch || String(o.id).includes(debouncedSearch))
      .map(
        (o) =>
          ({
            __type: "order_pending",
            id: `ORDER-${o.id}`,
            order_id: o.id,
            amount: o.total_amount,
            payment_method: null,
            status: "pending",
            created_at: o.updated_at || o.created_at,
          }) as PaymentRecord,
      );
  }, [filterStatus, ordersForPayment, debouncedSearch]);

  const filteredPayments = useMemo(() => {
    if (filterStatus === "pending") {
      const start = (page - 1) * PAGE_SIZE;
      return pendingRows.slice(start, start + PAGE_SIZE);
    }
    return pagePayments;
  }, [filterStatus, pendingRows, pagePayments, page]);

  const totalCount =
    filterStatus === "pending" ? pendingRows.length : serverTotal;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const openView = useCallback(async (payment: any) => {
    try {
      setViewOpen(true);
      setViewLoading(true);
      setViewPayment(null);
      setViewOrder(null);
      const isPending = payment?.__type === "order_pending";
      const [pr, or] = await Promise.all([
        !isPending && payment?.id
          ? api.payments.getById(payment.id).catch(() => null)
          : Promise.resolve(null),
        payment?.order_id
          ? api.orders.getById(payment.order_id).catch(() => null)
          : Promise.resolve(null),
      ]);
      setViewPayment(
        isPending
          ? payment
          : ((pr as any)?.data?.data?.payment ??
              (pr as any)?.data?.payment ??
              payment),
      );
      setViewOrder(
        (or as any)?.data?.data?.order ?? (or as any)?.data?.order ?? null,
      );
    } catch {
      toast.error("Failed to load details");
    } finally {
      setViewLoading(false);
    }
  }, []);

  const stats = useMemo(() => {
    const today = getApproximateServerDateString();
    const todayRevenueVal = payments
      .filter((p) => {
        if (p.status !== "paid") return false;
        // paid_at is the real payment time; created_at can be the sync time for
        // payments that originated offline, which would drop them from today.
        const when = (p as any).paid_at || p.created_at;
        return when?.startsWith(today);
      })
      .reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);

    return {
      pendingCount: ordersForPayment.length,
      todayRevenue: `${todayRevenueVal.toLocaleString()} Birr`,
      completedCount: payments.filter((p) => p.status === "paid").length,
    };
  }, [payments, ordersForPayment]);

  return {
    loading,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterMethod,
    setFilterMethod,
    viewOpen,
    setViewOpen,
    viewLoading,
    viewPayment,
    viewOrder,
    filteredPayments,
    ordersForPayment,
    openView,
    stats,
    paymentMethods,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    totalCount,
    totalPages,
  };
};

export default usePaymentData;
