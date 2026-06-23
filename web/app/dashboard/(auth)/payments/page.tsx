"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  EyeIcon,
  WalletIcon,
  BanknoteIcon,
  ClockIcon,
  CalculatorIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatCards, type StatCard } from "@/components/stat-cards";
import { Payments } from "@/lib/resources";
import { birr, shortDate, displayStatus, statusBadgeVariant } from "@/lib/format";

type Payment = {
  id: string;
  order_id: string | null;
  order_number: number | null;
  amount: number | null;
  payment_method: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string;
};

// paid_at is when the payment was actually taken. created_at is the sync time
// for payments that came from an offline client, so it misrepresents the date.
const paymentDate = (r: Payment) => r.paid_at || r.created_at;

const columns: Column<Payment>[] = [
  { key: "id", label: "Payment", render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span> },
  {
    key: "order_number",
    label: "Order",
    render: (r) =>
      r.order_id ? (
        <Link
          href={`/dashboard/orders?focus=${r.order_id}`}
          className="font-semibold text-primary hover:underline"
        >
          #{r.order_number ?? "—"}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  { key: "amount", label: "Amount", render: (r) => birr(r.amount) },
  { key: "payment_method", label: "Method", render: (r) => <span className="capitalize">{r.payment_method ?? "—"}</span> },
  { key: "status", label: "Status", render: (r) => <Badge variant={statusBadgeVariant(r.status)} className="capitalize">{displayStatus(r.status)}</Badge> },
  { key: "paid_at", label: "Date", render: (r) => shortDate(paymentDate(r)) },
];

const PAGE_SIZE = 25;

export default function PaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [count, setCount] = useState(0);
  const [serverStats, setServerStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const reload = useCallback(() => {
    setLoading(true);
    const params: Record<string, any> = { page: page + 1, limit: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return Payments.page<Payment>(params)
      .then((res) => {
        setRows(res.rows);
        setCount(res.count);
        setServerStats(res.stats);
      })
      .catch((e: any) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, status, dateFrom, dateTo]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Stats come from the server over the whole filtered window, not just the page.
  const cards: StatCard[] = useMemo(() => {
    const collected = serverStats.collected ?? 0;
    const paidCount = serverStats.paid_count ?? 0;
    return [
      { label: "Total payments", value: serverStats.total_payments ?? 0, icon: WalletIcon },
      {
        label: "Collected",
        value: birr(collected),
        hint: `${paidCount} paid`,
        icon: BanknoteIcon,
        valueClass: "text-emerald-600 dark:text-emerald-500",
      },
      {
        label: "Pending",
        value: serverStats.pending ?? 0,
        hint: "Awaiting confirmation",
        icon: ClockIcon,
        valueClass: "text-amber-600 dark:text-amber-500",
      },
      {
        label: "Avg payment",
        value: birr(serverStats.avg ?? 0),
        hint: "Paid only",
        icon: CalculatorIcon,
      },
    ];
  }, [serverStats]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Payment history for this branch." />

      <StatCards cards={cards} loading={loading} />

      <DataTable<Payment>
        columns={columns}
        rows={rows}
        loading={loading}
        searchPlaceholder="Search payments…"
        server={{
          total: count,
          page,
          pageSize: PAGE_SIZE,
          onPageChange: setPage,
          onSearchChange: setSearch,
          onFilterChange: (key, value) => {
            setPage(0);
            if (key === "status") setStatus(value);
          },
          onRangeChange: (_key, range) => {
            setPage(0);
            setDateFrom(range.from);
            setDateTo(range.to);
          },
        }}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "paid", label: "Paid" },
              { value: "pending", label: "Pending" },
              { value: "failed", label: "Failed" },
            ],
          },
        ]}
        dateFilters={[{ key: "paid_at", label: "Date", getDate: (r) => paymentDate(r) }]}
        rowActions={(r) => (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/payments/${r.id}`}>
              <EyeIcon className="size-4" />
              View
            </Link>
          </Button>
        )}
      />
    </div>
  );
}
