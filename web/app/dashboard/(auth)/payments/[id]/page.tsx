"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { Orders, Payments } from "@/lib/resources";
import { birr, shortDate } from "@/lib/format";
import { formatOrderNumber } from "@/lib/utils";

type OrderItem = {
  id: string;
  name?: string | null;
  menu_item_name?: string | null;
  quantity: number;
  unit_price?: number | null;
  subtotal?: number | null;
};

type Order = {
  id: string;
  order_number?: number | null;
  type?: string | null;
  status?: string | null;
  payment_status?: string | null;
  total_amount?: number | null;
  table_number?: number | null;
  employee_name?: string | null;
  employee_role?: string | null;
  notes?: string | null;
  created_at?: string;
  items?: OrderItem[];
};

type Payment = {
  id: string;
  order_id: string | null;
  amount: number | null;
  payment_method: string | null;
  status: string | null;
  processed_by_name?: string | null;
  order_type?: string | null;
  table_number?: number | null;
  paid_at?: string | null;
  created_at: string;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Payments.get(id)
      .then(async (p: Payment) => {
        if (!active) return;
        setPayment(p);
        if (p?.order_id) {
          const o = await Orders.get(p.order_id).catch(() => null);
          if (active) setOrder(o);
        }
      })
      .catch((e: any) => toast.error(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment details"
        description={`Payment ${id.slice(0, 8)}`}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/payments">
              <ArrowLeftIcon className="size-4" />
              Back to payments
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : !payment ? (
        <p className="text-muted-foreground text-sm">Payment not found.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Row
                  label="Reference"
                  value={<span className="font-mono text-xs">{payment.id}</span>}
                />
                <Row label="Amount" value={birr(payment.amount)} />
                <Row
                  label="Method"
                  value={<span className="capitalize">{payment.payment_method ?? "—"}</span>}
                />
                <Row
                  label="Status"
                  value={
                    <Badge
                      variant={payment.status === "paid" ? "success" : "muted"}
                      className="capitalize">
                      {payment.status ?? "—"}
                    </Badge>
                  }
                />
                <Row label="Processed by" value={payment.processed_by_name ?? "—"} />
                <Row label="Created" value={shortDate(payment.created_at)} />
                {payment.paid_at && (
                  <Row label="Paid at" value={shortDate(payment.paid_at)} />
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Mapped order</CardTitle>
              {payment.order_id && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/orders">
                    Orders
                    <ExternalLinkIcon className="size-4" />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!payment.order_id ? (
                <p className="text-muted-foreground text-sm">
                  This payment is not linked to an order.
                </p>
              ) : !order ? (
                <p className="text-muted-foreground text-sm">
                  Order {payment.order_id.slice(0, 8)} could not be loaded.
                </p>
              ) : (
                <div className="space-y-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <Row label="Order" value={formatOrderNumber(order)} />
                    <Row
                      label="Type"
                      value={<span className="capitalize">{order.type ?? "—"}</span>}
                    />
                    <Row
                      label="Table"
                      value={
                        order.table_number != null
                          ? `Table ${order.table_number}`
                          : "—"
                      }
                    />
                    <Row
                      label="Ordered by"
                      value={order.employee_name ?? "—"}
                    />
                    <Row
                      label="Status"
                      value={<span className="capitalize">{order.status ?? "—"}</span>}
                    />
                    <Row label="Order total" value={birr(order.total_amount)} />
                  </dl>

                  <div className="rounded-md border">
                    <div className="bg-muted/50 text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-xs font-medium">
                      <span>Item</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Subtotal</span>
                    </div>
                    {(order.items ?? []).length === 0 ? (
                      <div className="text-muted-foreground px-3 py-4 text-center text-sm">
                        No items recorded for this order.
                      </div>
                    ) : (
                      (order.items ?? []).map((it) => (
                        <div
                          key={it.id}
                          className="grid grid-cols-[1fr_auto_auto] gap-3 border-t px-3 py-2 text-sm">
                          <span>{it.name ?? it.menu_item_name ?? "Item"}</span>
                          <span className="text-right tabular-nums">×{it.quantity}</span>
                          <span className="text-right tabular-nums">
                            {birr(it.subtotal ?? (it.unit_price ?? 0) * it.quantity)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {order.notes && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Notes: </span>
                      {order.notes}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
