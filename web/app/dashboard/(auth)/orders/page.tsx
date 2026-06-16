"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EyeIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Orders, Payments, Settings } from "@/lib/resources";
import { getUser } from "@/lib/auth";
import { birr, shortDate } from "@/lib/format";
import { formatOrderNumber } from "@/lib/utils";

type OrderItem = {
  id: string;
  name?: string | null;
  menu_item_name?: string | null;
  quantity: number;
  unit_price?: number | null;
  subtotal?: number | null;
  main_category?: string | null;
};

type Order = {
  id: string;
  order_number?: number | null;
  type: string | null;
  status: string;
  payment_status: string | null;
  total_amount: number | null;
  created_at: string;
  table_number?: number | null;
  employee_name?: string | null;
  employee_role?: string | null;
  customer_id?: string | null;
  notes?: string | null;
  items?: OrderItem[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<Order | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() {
    setLoading(true);
    return Promise.all([Orders.list(), Settings.paymentMethods().catch(() => [])])
      .then(([o, m]) => {
        setOrders(o);
        setMethods(m);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    reload();
  }, []);

  function openPay(o: Order) {
    setPaying(o);
    setAmount(String(o.total_amount ?? 0));
    setMethod(methods[0]?.name ?? "cash");
  }

  async function takePayment() {
    if (!paying) return;
    setBusy(true);
    try {
      const uid = getUser()?.id;
      const payment = await Payments.create({
        order_id: paying.id,
        amount: Number(amount),
        payment_method: method,
        processed_by: uid,
      });
      await Payments.confirm(payment.id, uid);
      toast.success("Payment recorded");
      setPaying(null);
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const isPaid = (o: Order) => o.payment_status === "paid" || o.status === "paid";

  const columns: Column<Order>[] = [
    {
      key: "id",
      label: "Order",
      className: "font-mono text-xs",
      render: (o) => formatOrderNumber(o),
    },
    {
      key: "type",
      label: "Type",
      className: "capitalize",
      render: (o) => o.type ?? "—",
    },
    {
      key: "table_number",
      label: "Table",
      render: (o) => (o.table_number != null ? `Table ${o.table_number}` : "—"),
    },
    {
      key: "employee_name",
      label: "By",
      searchValue: (o) => `${o.employee_name ?? ""} ${o.employee_role ?? ""}`,
      render: (o) => (
        <div className="flex items-center gap-2">
          <span>{o.employee_name ?? "—"}</span>
          {o.employee_role === "cashier" && (
            <Badge variant="muted">Cashier</Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (o) => (
        <Badge variant="muted" className="capitalize">
          {o.status}
        </Badge>
      ),
    },
    {
      key: "payment_status",
      label: "Payment",
      searchValue: (o) => o.payment_status ?? "unpaid",
      render: (o) => (
        <Badge variant={isPaid(o) ? "success" : "muted"} className="capitalize">
          {o.payment_status ?? "unpaid"}
        </Badge>
      ),
    },
    { key: "total_amount", label: "Total", render: (o) => birr(o.total_amount) },
    {
      key: "created_at",
      label: "Created",
      className: "text-muted-foreground",
      render: (o) => shortDate(o.created_at),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Orders recorded at this branch."
        action={
          <Button asChild>
            <Link href="/dashboard/orders/new">
              <PlusIcon className="size-4" />
              New order
            </Link>
          </Button>
        }
      />

      <DataTable<Order>
        columns={columns}
        rows={orders}
        loading={loading}
        searchKeys={["id", "type", "status", "payment_status", "employee_name"]}
        searchPlaceholder="Search orders…"
        emptyMessage="No orders yet. Create your first order."
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "pending", label: "Pending" },
              { value: "completed", label: "Completed" },
              { value: "paid", label: "Paid" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
          {
            key: "payment",
            label: "Payment",
            options: [
              { value: "paid", label: "Paid" },
              { value: "unpaid", label: "Unpaid" },
            ],
            match: (o, v) => (v === "paid" ? isPaid(o) : !isPaid(o)),
          },
        ]}
        dateFilters={[
          { key: "created_at", label: "Date", getDate: (o) => o.created_at },
        ]}
        rowActions={(o) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewing(o)}>
              <EyeIcon className="size-4" />
              View
            </Button>
            {!isPaid(o) && (
              <Button variant="outline" size="sm" onClick={() => openPay(o)}>
                Take payment
              </Button>
            )}
          </div>
        )}
      />

      <Dialog open={!!paying} onOpenChange={(v) => !v && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (ETB)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value)}>
                {methods.length === 0 && <option value="cash">Cash</option>}
                {methods.map((m) => (
                  <option key={m.id} value={m.name}>{m.display_name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)}>Cancel</Button>
            <Button onClick={takePayment} disabled={busy}>
              {busy ? "Processing…" : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Order {viewing ? formatOrderNumber(viewing) : ""}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Ordered by</dt>
                <dd className="text-right font-medium">
                  {viewing.employee_name ?? "—"}
                  {viewing.employee_role && (
                    <span className="text-muted-foreground ml-1 capitalize font-normal">
                      ({viewing.employee_role.replace(/_/g, " ")})
                    </span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Table</dt>
                <dd className="text-right font-medium">
                  {viewing.table_number != null
                    ? `Table ${viewing.table_number}`
                    : "—"}
                </dd>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-right font-medium capitalize">
                  {viewing.type ?? "—"}
                </dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-right font-medium capitalize">
                  {viewing.status}
                </dd>
                <dt className="text-muted-foreground">Payment</dt>
                <dd className="text-right font-medium capitalize">
                  {viewing.payment_status ?? "unpaid"}
                </dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-right font-medium">
                  {shortDate(viewing.created_at)}
                </dd>
              </dl>

              <div className="rounded-md border">
                <div className="bg-muted/50 text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-xs font-medium">
                  <span>Item</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Subtotal</span>
                </div>
                {(viewing.items ?? []).length === 0 ? (
                  <div className="text-muted-foreground px-3 py-4 text-center text-sm">
                    No items recorded for this order.
                  </div>
                ) : (
                  (viewing.items ?? []).map((it) => (
                    <div
                      key={it.id}
                      className="grid grid-cols-[1fr_auto_auto] gap-3 border-t px-3 py-2 text-sm">
                      <span>{it.name ?? it.menu_item_name ?? "Item"}</span>
                      <span className="text-right tabular-nums">
                        ×{it.quantity}
                      </span>
                      <span className="text-right tabular-nums">
                        {birr(it.subtotal ?? (it.unit_price ?? 0) * it.quantity)}
                      </span>
                    </div>
                  ))
                )}
                <div className="grid grid-cols-[1fr_auto] gap-3 border-t px-3 py-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-right tabular-nums">
                    {birr(viewing.total_amount)}
                  </span>
                </div>
              </div>

              {viewing.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes: </span>
                  {viewing.notes}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
            {viewing && !isPaid(viewing) && (
              <Button
                onClick={() => {
                  const o = viewing;
                  setViewing(null);
                  openPay(o);
                }}>
                Take payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
