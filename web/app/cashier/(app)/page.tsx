"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Coffee,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Clock,
  Receipt,
  ChevronDown,
  ChevronUp,
  CreditCard,
  DollarSign,
  Clipboard,
  XCircle,
  UserCog,
  Users,
} from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StatsCard from "@/components/waiter/StatsCard";
import { displayStatus } from "@/lib/format";
import { useCashierAuth } from "@/components/cashier/auth-context";
import { cashierServices } from "@/lib/cashier/api";

const POLL_MS = 7000;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "transfer", label: "Transfer" },
  { value: "mobile", label: "Mobile" },
];

function formatCurrency(n: any): string {
  const v = Number(n) || 0;
  return `${v.toLocaleString()} Br`;
}

function prettyDept(slug: string, labels: Record<string, string>): string {
  if (!slug) return "—";
  return (
    labels[slug] ||
    slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function timeAgo(iso: any): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function clockTime(iso: any): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function itemSubtotal(it: any): number {
  const s = Number(it?.subtotal);
  if (Number.isFinite(s) && s > 0) return s;
  const qty = parseInt(it?.quantity, 10) || 0;
  const up = Number(it?.unit_price);
  if (Number.isFinite(up) && qty > 0) return up * qty;
  return 0;
}

function ymd(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Due = { department: string; subtotal: number; settled: boolean };
type Item = {
  id?: string;
  menu_item_id?: string;
  menu_item_name?: string;
  name?: string;
  quantity?: number;
  subtotal?: number;
  main_category?: string;
};
type QueueOrder = {
  id: string;
  order_number?: number;
  table_number?: number | null;
  total_amount?: number;
  created_at?: string;
  updated_at?: string;
  employee_name?: string;
  items?: Item[];
  department_dues?: Due[];
};

type ConfirmTarget =
  | { kind: "department"; order: QueueOrder; due: Due }
  | { kind: "whole"; order: QueueOrder };

export default function CashierQueuePage() {
  const router = useRouter();
  const { user, logout } = useCashierAuth();

  const departments = user?.departments ?? [];
  const isAttached = departments.length > 0;
  const departmentsKey = useMemo(() => departments.join(","), [departments]);

  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deptLabels, setDeptLabels] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const [range, setRange] = useState<"today" | "yesterday">("today");
  const [payments, setPayments] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [confirmMethod, setConfirmMethod] = useState("cash");
  // True from the instant a confirm is submitted until it settles — blocks a
  // second click from firing a duplicate payment within the same render tick.
  const submittingRef = useRef(false);
  const [cancelTarget, setCancelTarget] = useState<QueueOrder | null>(null);
  const [cancelPwdRequired, setCancelPwdRequired] = useState(false);
  const [cancelPwd, setCancelPwd] = useState("");
  const [verifyingCancel, setVerifyingCancel] = useState(false);

  // Does this branch require a password to cancel an order?
  useEffect(() => {
    (async () => {
      try {
        const res: any = await cashierServices.settings.getCancelPasswordStatus();
        const payload = res?.data ?? res;
        setCancelPwdRequired(Boolean(payload?.data?.is_set ?? payload?.is_set));
      } catch {
        /* ignore — treat as not required */
      }
    })();
  }, []);

  // ── Department labels ──────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res: any = await cashierServices.menu.getMainCategories();
        const payload = res?.data ?? res;
        const list =
          payload?.data?.mainCategories ||
          payload?.mainCategories ||
          payload?.data ||
          [];
        const map: Record<string, string> = {};
        (Array.isArray(list) ? list : []).forEach((entry: any) => {
          const slug = String(entry?.slug || entry?.name || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          if (slug) map[slug] = String(entry?.name || slug).replace(/_/g, " ").trim();
        });
        if (active) setDeptLabels(map);
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ── Queue ──────────────────────────────────────────────────────────────────
  const loadQueue = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      try {
        const res: any = await cashierServices.orders.getCashierQueue(
          departmentsKey ? departmentsKey.split(",") : [],
        );
        const payload = res?.data ?? res;
        const list = payload?.data?.orders ?? payload?.orders ?? [];
        setOrders(Array.isArray(list) ? list : []);
      } catch (err: any) {
        if (showSpinner) toast.error(err?.message || "Failed to load orders");
      } finally {
        setLoading(false);
        if (showSpinner) setRefreshing(false);
      }
    },
    [departmentsKey],
  );

  const loadRef = useRef(loadQueue);
  loadRef.current = loadQueue;
  useEffect(() => {
    loadRef.current(false);
    const t = setInterval(() => loadRef.current(false), POLL_MS);
    return () => clearInterval(t);
  }, [departmentsKey]);

  // ── Recent payments (date-windowed ledger) ─────────────────────────────────
  const loadPayments = useCallback(async () => {
    const day = range === "today" ? ymd(0) : ymd(1);
    try {
      const res: any = await cashierServices.payments.history({
        date_from: day,
        date_to: day,
        limit: 100,
      });
      console.log("loadPayments", res);
      const payload = res?.data ?? res;
      const list = payload?.data?.payments ?? payload?.payments ?? [];
      const filtered = (Array.isArray(list) ? list : []).filter((p: any) => {
        if (!isAttached) return true;
        const dept = String(p?.meta?.department || "").trim().toLowerCase();
        return p?.meta?.scope === "department" && departments.includes(dept);
      });
      console.log("filtered payments", filtered);
      setPayments(filtered);
    } catch {
      setPayments([]);
    }
  }, [range, isAttached, departments]);

  const paymentsRef = useRef(loadPayments);
  paymentsRef.current = loadPayments;
  useEffect(() => {
    paymentsRef.current();
    const t = setInterval(() => paymentsRef.current(), POLL_MS * 2);
    return () => clearInterval(t);
  }, [range, departmentsKey]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid = payments.filter(
      (p) => String(p?.status || "").toLowerCase() === "paid",
    );
    const revenue = paid.reduce((s, p) => s + (Number(p?.amount) || 0), 0);
    let pending = 0;
    for (const o of orders) {
      if (isAttached) {
        for (const d of o.department_dues ?? []) {
          if (!d.settled) pending += Number(d.subtotal) || 0;
        }
      } else {
        pending += Number(o.total_amount) || 0;
      }
    }
    return { count: paid.length, revenue, pending };
  }, [payments, orders, isAttached]);

  const refreshAll = useCallback(() => {
    loadQueue(true);
    loadPayments();
  }, [loadQueue, loadPayments]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openConfirm = useCallback((target: ConfirmTarget) => {
    setConfirmMethod("cash");
    setConfirmTarget(target);
  }, []);

  const doConfirm = useCallback(async () => {
    if (!confirmTarget) return;
    // Synchronous re-entrancy guard. `processing` is React state, so two clicks
    // fired in the same tick both read it as empty and would each submit a
    // payment (a real source of duplicate rows). A ref flips immediately, so the
    // second click is dropped before any request goes out.
    if (submittingRef.current) return;
    submittingRef.current = true;
    const order = confirmTarget.order;
    const key =
      confirmTarget.kind === "department"
        ? `${order.id}:${confirmTarget.due.department}`
        : order.id;
    if (processing.has(key)) {
      submittingRef.current = false;
      return;
    }
    setProcessing((prev) => new Set(prev).add(key));
    setConfirmTarget(null);
    try {
      if (confirmTarget.kind === "department") {
        const due = confirmTarget.due;
        setOrders((prev) =>
          prev
            .map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    department_dues: (o.department_dues ?? []).filter(
                      (d) => d.department !== due.department,
                    ),
                  }
                : o,
            )
            .filter((o) => (o.department_dues ?? []).some((d) => !d.settled)),
        );
        await cashierServices.payments.settleDepartment({
          order_id: order.id,
          department: due.department,
          payment_method: confirmMethod,
          processed_by: user?.id,
        });
        toast.success(
          `${prettyDept(due.department, deptLabels)} settled — ${formatCurrency(due.subtotal)}`,
        );
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        const createRes: any = await cashierServices.payments.create({
          order_id: order.id,
          amount: order.total_amount,
          payment_method: confirmMethod,
          status: "paid",
          processed_by: user?.id,
        });
        const createdId =
          createRes?.data?.data?.payment?.id ??
          createRes?.data?.payment?.id ??
          null;
        if (createdId) {
          await cashierServices.payments.confirm(createdId, {
            processed_by: user?.id,
          });
        }
        toast.success(
          `Order #${order.order_number ?? ""} settled — ${formatCurrency(order.total_amount)}`,
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm payment");
    } finally {
      submittingRef.current = false;
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      loadQueue(false);
      loadPayments();
    }
  }, [confirmTarget, confirmMethod, processing, user?.id, deptLabels, loadQueue, loadPayments]);

  const doCancel = useCallback(async () => {
    const order = cancelTarget;
    if (!order) return;
    const key = `cancel:${order.id}`;
    if (processing.has(key) || verifyingCancel) return;

    // Gate on the branch cancel password when one is configured.
    if (cancelPwdRequired) {
      if (!cancelPwd.trim()) {
        toast.error("Enter the cancel password");
        return;
      }
      setVerifyingCancel(true);
      try {
        const res: any = await cashierServices.settings.verifyCancelPassword(
          cancelPwd.trim(),
        );
        const payload = res?.data ?? res;
        if (!Boolean(payload?.data?.valid ?? payload?.valid)) {
          toast.error("Incorrect cancel password");
          setVerifyingCancel(false);
          return;
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to verify password");
        setVerifyingCancel(false);
        return;
      }
      setVerifyingCancel(false);
    }

    setProcessing((prev) => new Set(prev).add(key));
    setCancelTarget(null);
    setCancelPwd("");
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    try {
      await cashierServices.orders.updateStatus(order.id, { status: "cancelled" });
      await cashierServices.payments.create({
        order_id: order.id,
        amount: order.total_amount,
        payment_method: "cash",
        status: "cancelled",
        processed_by: user?.id,
      });
      toast.success(`Order #${order.order_number ?? ""} cancelled`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel order");
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      loadQueue(false);
    }
  }, [cancelTarget, processing, verifyingCancel, cancelPwdRequired, cancelPwd, user?.id, loadQueue]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onLogout = useCallback(() => {
    logout();
    router.replace("/cashier/login");
  }, [logout, router]);

  const itemsForDept = useCallback(
    (order: QueueOrder, dept: string) =>
      (order.items ?? []).filter(
        (it) =>
          (String(it?.main_category || "").trim().toLowerCase() || "other") === dept,
      ),
    [],
  );

  const ItemLines = ({ items }: { items: Item[] }) =>
    items.length > 0 ? (
      <div className="space-y-1 rounded-xl border bg-background p-2.5">
        {items.map((it, i) => (
          <div key={it.id || i} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted-foreground">
              <span className="mr-1 font-extrabold text-foreground">
                {parseInt(String(it.quantity), 10) || 1}x
              </span>
              {it.menu_item_name || it.name || "Item"}
            </span>
            <span className="font-extrabold text-foreground">
              {formatCurrency(itemSubtotal(it))}
            </span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header banner */}
      <Card className="border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background shadow-sm">
        <CardContent className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary/20 p-2.5 rounded-2xl text-primary shrink-0">
              <Coffee className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-foreground truncate">
                {user?.full_name || user?.username || "Cashier"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {isAttached ? (
                  departments.map((d) => (
                    <Badge key={d} variant="info" className="text-[9px] uppercase">
                      {prettyDept(d, deptLabels)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="muted" className="text-[9px] uppercase">
                    All departments
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshing}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/cashier/employees">
                <Users className="size-4" />
                Employees
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/cashier/profile">
                <UserCog className="size-4" />
                Profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title={`${range === "today" ? "Today's" : "Yesterday's"} Payments`}
          value={stats.count}
          icon={<CreditCard className="w-5 h-5" />}
          variant="info"
        />
        <StatsCard
          title={`${range === "today" ? "Today's" : "Yesterday's"} Revenue`}
          value={formatCurrency(stats.revenue)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
        />
        <StatsCard
          title="Pending"
          value={formatCurrency(stats.pending)}
          icon={<Clipboard className="w-5 h-5" />}
          variant="warning"
        />
      </div>

      {/* Date filter */}
      <div className="flex justify-center">
        <div className="flex bg-muted/50 p-1 rounded-xl border">
          {(["today", "yesterday"] as const).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "ghost"}
              size="sm"
              onClick={() => setRange(r)}
              className="h-8 text-xs font-bold px-4 sm:px-6 uppercase"
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Ready for Payment</CardTitle>
            <CardDescription>Orders sent by waiters</CardDescription>
            <CardAction>
              <Badge variant="info" className="text-xs font-bold">
                {orders.length} Orders
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
                <Receipt className="h-8 w-8" />
                <p className="text-sm font-bold">No orders waiting for payment</p>
                <p className="text-xs">New orders appear here automatically.</p>
              </div>
            ) : (
              orders.map((order) => {
                const dues = order.department_dues ?? [];
                return (
                  <div
                    key={order.id}
                    className="border rounded-2xl p-4 bg-muted/20 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-foreground">
                          Order #{order.order_number ?? "—"}
                          {order.table_number != null ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              Table {order.table_number}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground flex items-center gap-1 flex-wrap">
                          {order.employee_name || "Waiter"}
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(order.created_at)}
                          </span>
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-success shrink-0">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>

                    {isAttached ? (
                      <>
                      {dues.length === 0 ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">
                          Nothing to settle for your department.
                        </p>
                      ) : (
                        dues.map((due) => {
                          const key = `${order.id}:${due.department}`;
                          const busy = processing.has(key);
                          return (
                            <div key={due.department} className="rounded-xl border bg-background p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-extrabold uppercase tracking-wide text-foreground">
                                  {prettyDept(due.department, deptLabels)}
                                </span>
                                {due.settled ? (
                                  <Badge variant="success" className="text-[9px] uppercase">
                                    Paid
                                  </Badge>
                                ) : (
                                  <span className="text-sm font-extrabold text-foreground">
                                    {formatCurrency(due.subtotal)}
                                  </span>
                                )}
                              </div>
                              <ItemLines items={itemsForDept(order, due.department)} />
                              {!due.settled ? (
                                <Button
                                  size="sm"
                                  className="w-full h-9 bg-success hover:bg-success/90 text-white font-extrabold"
                                  disabled={busy}
                                  onClick={() => openConfirm({ kind: "department", order, due })}
                                >
                                  {busy ? "Processing…" : "Confirm payment"}
                                </Button>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-9 border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold"
                        disabled={processing.has(`cancel:${order.id}`)}
                        onClick={() => setCancelTarget(order)}
                      >
                        <XCircle className="size-4" />
                        Cancel order
                      </Button>
                      </>
                    ) : (
                      <>
                        <ItemLines items={order.items ?? []} />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-10 bg-success hover:bg-success/90 text-white font-extrabold"
                            disabled={processing.has(order.id)}
                            onClick={() => openConfirm({ kind: "whole", order })}
                          >
                            {processing.has(order.id) ? "Processing…" : "Confirm payment"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-10 font-extrabold"
                            disabled={processing.has(`cancel:${order.id}`)}
                            onClick={() => setCancelTarget(order)}
                          >
                            <XCircle className="size-4" />
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent payments */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Recent Payments</CardTitle>
            <CardDescription>Processed {range === "today" ? "today" : "yesterday"}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
                <Receipt className="h-8 w-8" />
                <p className="text-sm font-bold">No payments yet</p>
              </div>
            ) : (
              payments.map((p) => {
                const open = expanded.has(p.id);
                const dept = String(p?.meta?.department || "").trim().toLowerCase();
                const status = String(p?.status || "").toLowerCase();
                return (
                  <div key={p.id} className="border rounded-2xl p-4 bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            status === "paid"
                              ? "success"
                              : status === "deleted"
                                ? "destructive"
                                : "warning"
                          }
                          className="text-[9px] uppercase"
                        >
                          {displayStatus(p.status)}
                        </Badge>
                        {p.order_number != null ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.id)}
                            className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold text-primary hover:bg-primary/20"
                          >
                            #{p.order_number}
                          </button>
                        ) : null}
                      </div>
                      <span className="text-sm font-extrabold text-foreground">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground">
                      <Badge variant="outline" className="text-[9px] uppercase">
                        {(p.payment_method || "—").replace("_", " ")}
                      </Badge>
                      {dept ? (
                        <Badge variant="info" className="text-[9px] uppercase">
                          {prettyDept(dept, deptLabels)}
                        </Badge>
                      ) : (
                        <span />
                      )}
                      <span>{clockTime(p.paid_at || p.created_at)}</span>
                    </div>
                    <div className="pt-1.5 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 p-0 text-[10px] font-extrabold text-primary hover:bg-transparent"
                        onClick={() => toggleExpand(p.id)}
                      >
                        {open ? (
                          <>Hide details <ChevronUp className="w-3 h-3 ml-1" /></>
                        ) : (
                          <>Show details <ChevronDown className="w-3 h-3 ml-1" /></>
                        )}
                      </Button>
                    </div>
                    {open ? (
                      <div className="rounded-xl border bg-background p-2.5 text-[11px] text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Order</span>
                          <span className="font-extrabold text-foreground">
                            #{p.order_number ?? p.order_id ?? "—"}
                          </span>
                        </div>
                        {p.table_number != null ? (
                          <div className="flex justify-between">
                            <span>Table</span>
                            <span className="font-extrabold text-foreground">{p.table_number}</span>
                          </div>
                        ) : null}
                        {p.processed_by_name ? (
                          <div className="flex justify-between">
                            <span>By</span>
                            <span className="font-extrabold text-foreground">{p.processed_by_name}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm payment modal */}
      <Dialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm payment</DialogTitle>
            <DialogDescription>
              {confirmTarget
                ? confirmTarget.kind === "department"
                  ? `Settle ${prettyDept(confirmTarget.due.department, deptLabels)} for order #${confirmTarget.order.order_number ?? ""}.`
                  : `Settle the full order #${confirmTarget.order.order_number ?? ""}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {confirmTarget ? (
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                <span className="text-sm font-semibold text-muted-foreground">Amount due</span>
                <span className="text-xl font-extrabold text-foreground">
                  {formatCurrency(
                    confirmTarget.kind === "department"
                      ? confirmTarget.due.subtotal
                      : confirmTarget.order.total_amount,
                  )}
                </span>
              </div>
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <select
                  value={confirmMethod}
                  onChange={(e) => setConfirmMethod(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={doConfirm}
              disabled={
                !confirmTarget ||
                processing.has(
                  confirmTarget.kind === "department"
                    ? `${confirmTarget.order.id}:${confirmTarget.due.department}`
                    : confirmTarget.order.id,
                )
              }
            >
              <CheckCircle2 className="size-4" />
              Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel order modal */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCancelTarget(null);
            setCancelPwd("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
            <DialogDescription>
              Cancel order #{cancelTarget?.order_number ?? ""}
              {cancelTarget?.table_number != null ? ` (Table ${cancelTarget.table_number})` : ""}?
              This voids the order and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {cancelPwdRequired ? (
            <div className="space-y-1.5 py-1">
              <Label htmlFor="cancel-pwd">Cancel password</Label>
              <Input
                id="cancel-pwd"
                type="password"
                value={cancelPwd}
                onChange={(e) => setCancelPwd(e.target.value)}
                placeholder="Enter cancel password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") doCancel();
                }}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelTarget(null);
                setCancelPwd("");
              }}
            >
              Keep order
            </Button>
            <Button variant="destructive" onClick={doCancel} disabled={verifyingCancel}>
              <XCircle className="size-4" />
              {verifyingCancel ? "Verifying…" : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
