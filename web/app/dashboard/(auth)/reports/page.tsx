"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ReceiptTextIcon, BanknoteIcon, CheckCircle2Icon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Orders, Payments } from "@/lib/resources";
import { birr } from "@/lib/format";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([Orders.list().catch(() => []), Payments.history().catch(() => [])])
      .then(([o, p]) => {
        setOrders(o);
        setPayments(p);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const paid = orders.filter((o) => o.payment_status === "paid");
  const revenue = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const cards = [
    { label: "Total orders", value: String(orders.length), icon: ReceiptTextIcon },
    { label: "Paid orders", value: String(paid.length), icon: CheckCircle2Icon },
    { label: "Revenue", value: birr(revenue), icon: BanknoteIcon },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Sales summary for the selected branch." />

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">{c.label}</CardTitle>
              <c.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-semibold">{c.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders by status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.keys(byStatus).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground py-8 text-center">
                    No data.
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(byStatus).map(([status, count]) => (
                  <TableRow key={status}>
                    <TableCell className="capitalize">{status}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
