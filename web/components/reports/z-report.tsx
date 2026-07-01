"use client";

import { useCallback, useEffect, useState } from "react";
import { Printer, RefreshCw, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { birr } from "@/lib/format";
import { Orders } from "@/lib/resources";

interface ZReportData {
  report_date: string;
  period_start: string;
  period_end: string;
  summary: {
    total_orders: number;
    gross_sales: number;
    refunds: number;
    discounts: number;
    net_sales: number;
  };
  payment_breakdown: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  employee_activity: Array<{
    employee_id: number;
    employee_name: string;
    orders_count: number;
    total_sales: number;
  }>;
  voided_transactions: Array<{
    order_id: number;
    employee_id: number;
    employee_name: string;
    amount: number;
    created_at: string;
  }>;
  category_breakdown: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
}

const fmtDate = (d: string) => new Date(d).toLocaleString();
const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// Describe the active window, driven entirely by the parent page's date picker.
const rangeLabel = (from: string, to: string) => {
  if (from && to) return from === to ? fmtDay(from) : `${fmtDay(from)} – ${fmtDay(to)}`;
  if (from) return `From ${fmtDay(from)}`;
  if (to) return `Through ${fmtDay(to)}`;
  return "Today";
};

export function ZReport({ dateFrom = "", dateTo = "" }: { dateFrom?: string; dateTo?: string }) {
  const [loading, setLoading] = useState(false);
  const [zReport, setZReport] = useState<ZReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchZReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Orders.zReport({
        start_date: dateFrom || undefined,
        end_date: dateTo || undefined,
      });
      setZReport(data ?? null);
    } catch (err: any) {
      setError(err.message || "Failed to generate Z-report");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  // Refetch whenever the parent's selected range changes.
  useEffect(() => {
    fetchZReport();
  }, [fetchZReport]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="size-5" />
              Z-Report · {rangeLabel(dateFrom, dateTo)}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchZReport} disabled={loading}>
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Sales settlement summary for the selected date range. Adjust the range using the date
            picker at the top of the page.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="text-destructive pt-6 text-sm">{error}</CardContent>
        </Card>
      )}

      {zReport && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => window.print()} variant="outline">
              <Printer className="mr-2 size-4" />
              Print Report
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-sm">Total Orders</p>
                  <p className="text-2xl font-bold">{zReport.summary.total_orders}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Gross Sales</p>
                  <p className="text-2xl font-bold">{birr(zReport.summary.gross_sales)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Refunds</p>
                  <p className="text-destructive text-2xl font-bold">
                    {birr(zReport.summary.refunds)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Net Sales</p>
                  <p className="text-2xl font-bold text-green-600">
                    {birr(zReport.summary.net_sales)}
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground mt-4 space-y-0.5 text-sm">
                <p>
                  Period: {fmtDate(zReport.period_start)} – {fmtDate(zReport.period_end)}
                </p>
                <p>Generated: {fmtDate(zReport.report_date)}</p>
              </div>
            </CardContent>
          </Card>

          <ZTable
            title="Payment Breakdown"
            head={["Method", "Count", "Amount", "%"]}
            align={["left", "right", "right", "right"]}
            rows={zReport.payment_breakdown.map((p) => [
              <span key="m" className="capitalize">
                {p.method}
              </span>,
              p.count,
              birr(p.amount),
              `${p.percentage.toFixed(1)}%`,
            ])}
          />

          <ZTable
            title="Employee Activity"
            head={["Employee", "Orders", "Sales"]}
            align={["left", "right", "right"]}
            rows={zReport.employee_activity.map((e) => [
              e.employee_name,
              e.orders_count,
              birr(e.total_sales),
            ])}
          />

          <ZTable
            title="Category Breakdown"
            head={["Category", "Count", "Amount"]}
            align={["left", "right", "right"]}
            rows={zReport.category_breakdown.map((c) => [
              <span key="c" className="capitalize">
                {c.category}
              </span>,
              c.count,
              birr(c.amount),
            ])}
          />

          {zReport.voided_transactions.length > 0 && (
            <ZTable
              title="Voided Transactions"
              head={["Order ID", "Employee", "Amount", "Time"]}
              align={["left", "left", "right", "left"]}
              rows={zReport.voided_transactions.map((t) => [
                `#${t.order_id}`,
                t.employee_name,
                <span key="a" className="text-destructive">
                  {birr(t.amount)}
                </span>,
                fmtDate(t.created_at),
              ])}
            />
          )}
        </>
      )}
    </div>
  );
}

function ZTable({
  title,
  head,
  rows,
  align,
}: {
  title: string;
  head: string[];
  rows: React.ReactNode[][];
  align: ("left" | "right")[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {head.map((h, i) => (
                <th
                  key={h}
                  className={`py-2 ${align[i] === "right" ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`py-2 ${align[ci] === "right" ? "text-right" : "text-left"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
