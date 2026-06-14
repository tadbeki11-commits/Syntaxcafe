"use client";

import { useState } from "react";
import { Printer, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => new Date(d).toLocaleString();

export function ZReport() {
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [zReport, setZReport] = useState<ZReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchZReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Orders.zReport({ start_date: startDate, end_date: endDate });
      setZReport(data ?? null);
    } catch (err: any) {
      setError(err.message || "Failed to generate Z-report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="size-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-input bg-background block h-9 rounded-md border px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-input bg-background block h-9 rounded-md border px-3 text-sm"
              />
            </div>
            <Button onClick={fetchZReport} disabled={loading}>
              {loading ? "Generating…" : "Generate Report"}
            </Button>
          </div>
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
