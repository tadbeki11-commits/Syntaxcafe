"use client";

import Link from "next/link";
import { EyeIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResourceManager, type Column } from "@/components/resource-manager";
import { Payments } from "@/lib/resources";
import { birr, shortDate } from "@/lib/format";

type Payment = {
  id: string;
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
  { key: "amount", label: "Amount", render: (r) => birr(r.amount) },
  { key: "payment_method", label: "Method", render: (r) => <span className="capitalize">{r.payment_method ?? "—"}</span> },
  { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "paid" ? "success" : "muted"} className="capitalize">{r.status ?? "—"}</Badge> },
  { key: "paid_at", label: "Date", render: (r) => shortDate(paymentDate(r)) },
];

export default function PaymentsPage() {
  return (
    <ResourceManager<Payment>
      title="Payments"
      description="Payment history for this branch."
      columns={columns}
      searchKeys={["id", "payment_method", "status"]}
      searchPlaceholder="Search payments…"
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
      load={Payments.history}
      rowActions={(r) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/payments/${r.id}`}>
            <EyeIcon className="size-4" />
            View
          </Link>
        </Button>
      )}
    />
  );
}
