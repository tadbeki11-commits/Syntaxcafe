"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, DollarSign, TrendingDown, Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/stat-card";
import { birr } from "@/lib/format";
import { formatOrderNumber } from "@/lib/utils";
import { Orders, Users as UsersResource } from "@/lib/resources";

const LIVE_ORDER_TYPE = "cafe";

interface EmployeeSummary {
  employee_id: string;
  employee_name: string;
  orders_total: number;
  paid_total: number;
  unpaid_total: number;
  orders_count: number;
  payments_count: number;
  last_order_at?: string | null;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getEmployeeId = (order: any): string | null => {
  const candidate = order?.employee_id ?? order?.waiter_id ?? order?.created_by_id;
  if (candidate == null) return null;
  const id = String(candidate).trim();
  return id ? id : null;
};

const getEmployeeName = (user: any, fallbackId: string) => {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return name || user?.full_name || user?.name || user?.username || `Employee #${fallbackId}`;
};

export function StaffActivity() {
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("all");
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [detailOrder, setDetailOrder] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [users, rawOrders] = await Promise.all([
          UsersResource.list(),
          Orders.list({ type: LIVE_ORDER_TYPE }),
        ]);

        const usersById = new Map<string, any>();
        for (const u of Array.isArray(users) ? users : []) {
          const id = u?.id != null ? String(u.id).trim() : "";
          if (id) usersById.set(id, u);
        }

        const normalized = (Array.isArray(rawOrders) ? rawOrders : [])
          .map((order: any) => {
            const employeeId = getEmployeeId(order);
            if (!employeeId) return null;
            const user = usersById.get(employeeId);
            return {
              ...order,
              id: String(order?.id ?? ""),
              employee_id: employeeId,
              employee_name: order?.employee_name || getEmployeeName(user, employeeId),
              total_amount: num(order?.total_amount),
              status: String(order?.status || "pending"),
              payment_status: order?.payment_status ? String(order.payment_status) : null,
              type: String(order?.type || LIVE_ORDER_TYPE),
              table_number: order?.table_number ?? null,
              created_at: order?.created_at ?? null,
            };
          })
          .filter(Boolean) as any[];

        const summaryByEmployee = new Map<string, EmployeeSummary>();
        for (const order of normalized) {
          const existing = summaryByEmployee.get(order.employee_id) || {
            employee_id: order.employee_id,
            employee_name: order.employee_name || `Employee #${order.employee_id}`,
            orders_total: 0,
            paid_total: 0,
            unpaid_total: 0,
            orders_count: 0,
            payments_count: 0,
            last_order_at: null,
          };

          existing.orders_total += num(order.total_amount);
          existing.orders_count += 1;
          if (String(order.payment_status || "").trim().toLowerCase() === "paid") {
            existing.paid_total += num(order.total_amount);
            existing.payments_count += 1;
          } else {
            existing.unpaid_total += num(order.total_amount);
          }

          if (order.created_at) {
            const cur = existing.last_order_at ? new Date(existing.last_order_at).getTime() : 0;
            const next = new Date(order.created_at).getTime();
            if (!cur || next >= cur) existing.last_order_at = order.created_at;
          }

          summaryByEmployee.set(order.employee_id, existing);
        }

        const list = Array.from(summaryByEmployee.values()).sort((a, b) => {
          if (b.orders_count !== a.orders_count) return b.orders_count - a.orders_count;
          return b.orders_total - a.orders_total;
        });

        setEmployees(list);
        setLiveOrders(normalized);
      } catch (e: any) {
        toast.error(e.message || "Failed to load employee orders");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const allSummary = useMemo(
    () =>
      employees.reduce(
        (acc, e) => {
          acc.orders_total += num(e.orders_total);
          acc.paid_total += num(e.paid_total);
          acc.unpaid_total += num(e.unpaid_total);
          acc.orders_count += num(e.orders_count);
          acc.payments_count += num(e.payments_count);
          return acc;
        },
        { orders_total: 0, paid_total: 0, unpaid_total: 0, orders_count: 0, payments_count: 0 },
      ),
    [employees],
  );

  const selectedEmployee = useMemo(
    () => (selectedId !== "all" ? employees.find((e) => e.employee_id === selectedId) : null),
    [employees, selectedId],
  );

  const activeSummary = selectedEmployee || allSummary;

  const detailOrders = useMemo(() => {
    if (selectedId === "all") return [];
    return liveOrders
      .filter((o) => String(o.employee_id) === selectedId)
      .sort(
        (a, b) =>
          new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime(),
      );
  }, [liveOrders, selectedId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter by Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm sm:w-72">
            <option value="all">All Employees</option>
            {employees.map((e) => (
              <option key={e.employee_id} value={e.employee_id}>
                {e.employee_name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Orders Total"
          value={birr(activeSummary.orders_total)}
          subtitle={`${activeSummary.orders_count} orders`}
          icon={<Users className="size-5" />}
        />
        <StatCard
          title="Paid Total"
          value={birr(activeSummary.paid_total)}
          subtitle={`${activeSummary.payments_count} payments`}
          icon={<DollarSign className="size-5" />}
          variant="success"
        />
        <StatCard
          title="Unpaid Total"
          value={birr(activeSummary.unpaid_total)}
          subtitle="Unpaid balance"
          icon={<TrendingDown className="size-5" />}
          variant="destructive"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employees Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Orders Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Unpaid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map((e) => (
                    <TableRow
                      key={e.employee_id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(e.employee_id)}
                      data-state={e.employee_id === selectedId ? "selected" : undefined}>
                      <TableCell className="font-medium">{e.employee_name}</TableCell>
                      <TableCell className="text-right">{birr(e.orders_total)}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {birr(e.paid_total)}
                      </TableCell>
                      <TableCell className="text-destructive text-right font-medium">
                        {birr(e.unpaid_total)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground py-10 text-center text-sm">
                      No employee order activity yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedId !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-center">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailOrders.length > 0 ? (
                  detailOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-bold">{formatOrderNumber(o)}</TableCell>
                      <TableCell className="capitalize">{o.type}</TableCell>
                      <TableCell>{o.table_number ?? "N/A"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {birr(o.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            o.status === "paid"
                              ? "success"
                              : o.status === "pending"
                                ? "warning"
                                : "secondary"
                          }
                          className="capitalize">
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            String(o.payment_status || "").toLowerCase() === "paid"
                              ? "success"
                              : "secondary"
                          }>
                          {o.payment_status || "unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {o.created_at ? new Date(o.created_at).toLocaleString() : "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setDetailOrder(o)}>
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-10 text-center text-sm">
                      No orders for this employee.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Order {detailOrder ? formatOrderNumber(detailOrder) : ""}
            </DialogTitle>
            <DialogDescription>
              {detailOrder?.employee_name} ·{" "}
              {detailOrder?.created_at
                ? new Date(detailOrder.created_at).toLocaleString()
                : ""}
            </DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(detailOrder.items) ? detailOrder.items : []).map(
                    (it: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{it?.menu_item_name || it?.name || "Item"}</TableCell>
                        <TableCell className="text-right">{it?.quantity ?? 1}</TableCell>
                        <TableCell className="text-right">
                          {birr(Number(it?.subtotal ?? it?.unit_price ?? it?.price ?? 0))}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>{birr(detailOrder.total_amount)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
