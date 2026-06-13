"use client";

import { useEffect, useState } from "react";
import {
  UtensilsCrossedIcon,
  BoxesIcon,
  ReceiptTextIcon,
  ArmchairIcon,
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
import { Menu, Inventory, Tables, Orders } from "@/lib/resources";
import { birr, shortDate } from "@/lib/format";

export default function HomePage() {
  const [stats, setStats] = useState({ menu: 0, inventory: 0, tables: 0, orders: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      Menu.items().catch(() => []),
      Inventory.list().catch(() => []),
      Tables.list().catch(() => []),
      Orders.list().catch(() => []),
    ])
      .then(([menu, inv, tables, orders]) => {
        setStats({
          menu: menu.length,
          inventory: inv.length,
          tables: tables.length,
          orders: orders.length,
        });
        setRecent(orders.slice(0, 8));
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Menu items", value: stats.menu, icon: UtensilsCrossedIcon },
    { label: "Inventory items", value: stats.inventory, icon: BoxesIcon },
    { label: "Orders", value: stats.orders, icon: ReceiptTextIcon },
    { label: "Tables", value: stats.tables, icon: ArmchairIcon },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="A snapshot of the selected branch." />

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
