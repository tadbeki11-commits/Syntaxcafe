"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
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

type Order = {
  id: string;
  order_number?: number | null;
  type: string | null;
  status: string;
  payment_status: string | null;
  total_amount: number | null;
  created_at: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<Order | null>(null);
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
        searchKeys={["id", "type", "status", "payment_status"]}
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
        rowActions={(o) =>
          !isPaid(o) ? (
            <Button variant="outline" size="sm" onClick={() => openPay(o)}>
              Take payment
            </Button>
          ) : null
        }
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
    </div>
  );
}
