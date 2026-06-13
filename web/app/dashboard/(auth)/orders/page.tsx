"use client";

import { Badge } from "@/components/ui/badge";
import { ResourceManager, type Column } from "@/components/resource-manager";
import { Orders } from "@/lib/resources";
import { birr, shortDate } from "@/lib/format";

type Order = {
  id: string;
  type: string | null;
  status: string;
  payment_status: string | null;
  total_amount: number | null;
  created_at: string;
};

const columns: Column<Order>[] = [
  { key: "id", label: "Order", render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span> },
  { key: "type", label: "Type", render: (r) => <span className="capitalize">{r.type ?? "—"}</span> },
  { key: "status", label: "Status", render: (r) => <Badge variant="muted" className="capitalize">{r.status}</Badge> },
  {
    key: "payment_status",
    label: "Payment",
    render: (r) => (
      <Badge variant={r.payment_status === "paid" ? "success" : "muted"} className="capitalize">
        {r.payment_status ?? "unpaid"}
      </Badge>
    ),
  },
  { key: "total_amount", label: "Total", render: (r) => birr(r.total_amount) },
  { key: "created_at", label: "Created", render: (r) => shortDate(r.created_at) },
];

export default function OrdersPage() {
  return (
    <ResourceManager<Order>
      title="Orders"
      description="Orders recorded at this branch."
      columns={columns}
      load={Orders.list}
    />
  );
}
