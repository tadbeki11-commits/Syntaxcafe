// Profit = paid order revenue − expenses, over a date range. Reuses the
// paid-order detection from reports.ts so "sales" matches the Reports page.
import {
  isVoidedOrderStatus,
  makeIsPaidOrder,
  normalizeId,
  normalizeStatus,
} from "./reports";

export interface ProfitResult {
  sales: number;
  expenses: number;
  profit: number;
}

// Fixed category set — keep in sync with the backend ExpensesService.
export const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "salaries", label: "Salaries" },
  { value: "supplies", label: "Supplies / Purchases" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

export const categoryLabel = (value: string): string =>
  EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const expenseAmount = (e: any): number =>
  (Number(e?.amount) || 0) + (Number(e?.amount_cents) || 0) / 100;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const parseYmd = (ymdStr: string): Date | null => {
  const m = String(ymdStr || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

export const rangeBounds = (
  from: string,
  to: string,
): { fromDt: Date | null; toDt: Date | null } => ({
  fromDt: from ? startOfDay(parseYmd(from) ?? new Date(from)) : null,
  toDt: to ? endOfDay(parseYmd(to) ?? new Date(to)) : null,
});

const withinRange = (value: any, fromDt: Date | null, toDt: Date | null) => {
  if (!fromDt && !toDt) return true;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return false;
  if (fromDt && dt < fromDt) return false;
  if (toDt && dt > toDt) return false;
  return true;
};

export const paidRevenue = (
  orders: any[],
  payments: any[],
  fromDt: Date | null = null,
  toDt: Date | null = null,
): number => {
  const ords = Array.isArray(orders) ? orders : [];
  const pays = Array.isArray(payments) ? payments : [];
  const paidPayments = pays.filter((p) => normalizeStatus(p?.status) === "paid");
  const paidOrderIdSet = new Set(
    paidPayments.map((p) => normalizeId(p?.order_id)).filter(Boolean),
  );
  const isPaid = makeIsPaidOrder(paidOrderIdSet);
  return ords.reduce((sum, o) => {
    if (!withinRange(o?.created_at, fromDt, toDt)) return sum;
    if (isVoidedOrderStatus(o?.status)) return sum;
    if (!isPaid(o)) return sum;
    const total = parseFloat(o?.total_amount);
    return Number.isFinite(total) ? sum + total : sum;
  }, 0);
};

export interface SalesSplit {
  paid: number;
  unpaid: number;
  total: number;
}

// Splits non-voided order totals into collected (paid) vs. outstanding
// (unpaid) over an optional date range. Uses the same paid-order detection
// as paidRevenue so the numbers match the Reports page.
export const salesSplit = (
  orders: any[],
  payments: any[],
  fromDt: Date | null = null,
  toDt: Date | null = null,
): SalesSplit => {
  const ords = Array.isArray(orders) ? orders : [];
  const pays = Array.isArray(payments) ? payments : [];
  const paidPayments = pays.filter((p) => normalizeStatus(p?.status) === "paid");
  const paidOrderIdSet = new Set(
    paidPayments.map((p) => normalizeId(p?.order_id)).filter(Boolean),
  );
  const isPaid = makeIsPaidOrder(paidOrderIdSet);
  let paid = 0;
  let unpaid = 0;
  for (const o of ords) {
    if (!withinRange(o?.created_at, fromDt, toDt)) continue;
    if (isVoidedOrderStatus(o?.status)) continue;
    const total = parseFloat(o?.total_amount);
    if (!Number.isFinite(total)) continue;
    if (isPaid(o)) paid += total;
    else unpaid += total;
  }
  return { paid, unpaid, total: paid + unpaid };
};

export const sumExpenses = (
  expenses: any[],
  fromDt: Date | null = null,
  toDt: Date | null = null,
): number =>
  (Array.isArray(expenses) ? expenses : []).reduce((sum, e) => {
    if (!withinRange(e?.expense_date ?? e?.created_at, fromDt, toDt)) return sum;
    return sum + expenseAmount(e);
  }, 0);

export const computeProfit = (
  orders: any[],
  payments: any[],
  expenses: any[],
  from: string,
  to: string,
): ProfitResult => {
  const { fromDt, toDt } = rangeBounds(from, to);
  const sales = paidRevenue(orders, payments, fromDt, toDt);
  const expensesTotal = sumExpenses(expenses, fromDt, toDt);
  return { sales, expenses: expensesTotal, profit: sales - expensesTotal };
};

export const ymd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

export const todayRange = (): { from: string; to: string } => {
  const t = ymd(new Date());
  return { from: t, to: t };
};

export const monthRange = (): { from: string; to: string } => {
  const now = new Date();
  return {
    from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};
