"use client";

import { useEffect, useState } from "react";
import {
  UtensilsCrossedIcon,
  BoxesIcon,
  ReceiptTextIcon,
  ArmchairIcon,
  TrendingUpIcon,
  WalletIcon,
  ClockIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Menu, Inventory, Tables, Orders, Payments } from "@/lib/resources";
import { birr, shortDate } from "@/lib/format";
import { salesSplit, todayRange, rangeBounds, type SalesSplit } from "@/lib/profit";

const EMPTY_SALES: SalesSplit = { paid: 0, unpaid: 0, total: 0 };

export default function HomePage() {
  const [stats, setStats] = useState({ menu: 0, inventory: 0, tables: 0, orders: 0 });
  const [today, setToday] = useState<SalesSplit>(EMPTY_SALES);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      Menu.items().catch(() => []),
      Inventory.list().catch(() => []),
      Tables.list().catch(() => []),
      Orders.list().catch(() => []),
      Payments.history().catch(() => []),
    ])
      .then(([menu, inv, tables, orders, payments]) => {
        setStats({
          menu: menu.length,
          inventory: inv.length,
          tables: tables.length,
          orders: orders.length,
        });
        const { from, to } = todayRange();
        const { fromDt, toDt } = rangeBounds(from, to);
        setToday(salesSplit(orders, payments, fromDt, toDt));
        setRecent(orders.slice(0, 8));
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const todayCards = [
    {
      label: "Today's revenue",
      value: today.paid,
      hint: "Collected",
      icon: TrendingUpIcon,
      valueClass: "text-emerald-600 dark:text-emerald-500",
    },
    {
      label: "Unpaid sales",
      value: today.unpaid,
      hint: "Outstanding",
      icon: ClockIcon,
      valueClass: "text-amber-600 dark:text-amber-500",
    },
    {
      label: "Total sales",
      value: today.total,
      hint: "Paid + unpaid",
      icon: WalletIcon,
      valueClass: "",
    },
  ];

  const cards = [
    { label: "Menu items", value: stats.menu, icon: UtensilsCrossedIcon },
    { label: "Inventory items", value: stats.inventory, icon: BoxesIcon },
    { label: "Orders", value: stats.orders, icon: ReceiptTextIcon },
    { label: "Tables", value: stats.tables, icon: ArmchairIcon },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="A snapshot of the selected branch." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {todayCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <div className={`text-2xl font-semibold ${c.valueClass}`}>
                    {birr(c.value)}
                  </div>
                  <p className="text-muted-foreground text-xs">{c.hint}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-semibold">{c.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    No orders yet.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id?.slice(0, 8)}</TableCell>
                    <TableCell className="capitalize">{o.type ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="muted" className="capitalize">{o.status}</Badge>
                    </TableCell>
                    <TableCell>{birr(o.total_amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{shortDate(o.created_at)}</TableCell>
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
