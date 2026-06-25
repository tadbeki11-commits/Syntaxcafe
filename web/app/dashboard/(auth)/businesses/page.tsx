"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { birr } from "@/lib/format";

type Business = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_branches: number | null;
  is_active: boolean;
  branch_count: number;
  user_count: number;
  order_count: number;
  revenue: number;
};

const columns: Column<Business>[] = [
  {
    key: "name",
    label: "Name",
    searchValue: (b) => `${b.name} ${b.slug}`,
    render: (b) => (
      <>
        <Link
          href={`/dashboard/businesses/${b.id}`}
          className="font-medium hover:underline">
          {b.name}
        </Link>
        <div className="text-muted-foreground text-xs">{b.slug}</div>
      </>
    ),
  },
  { key: "plan", label: "Plan", className: "capitalize" },
  {
    key: "branch_count",
    label: "Branches",
    sortable: true,
    sortValue: (b) => b.branch_count,
    render: (b) => (
      <>
        {b.branch_count}
        {b.max_branches != null && (
          <span className="text-muted-foreground"> / {b.max_branches}</span>
        )}
      </>
    ),
  },
  {
    key: "user_count",
    label: "Users",
    sortable: true,
    sortValue: (b) => b.user_count,
    render: (b) => b.user_count,
  },
  {
    key: "order_count",
    label: "Orders",
    sortable: true,
    sortValue: (b) => b.order_count,
    render: (b) => b.order_count.toLocaleString(),
  },
  {
    key: "revenue",
    label: "Revenue",
    sortable: true,
    sortValue: (b) => b.revenue,
    render: (b) => <span className="font-medium">{birr(b.revenue)}</span>,
  },
  {
    key: "is_active",
    label: "Status",
    searchValue: (b) => (b.is_active ? "active" : "suspended"),
    render: (b) => <StatusBadge active={b.is_active} />,
  },
];

export default function BusinessesPage() {
  const [rows, setRows] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Business[]>("/platform/businesses")
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground text-sm">
            Owners and their cafes across the platform.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/businesses/new">
            <PlusIcon className="size-4" />
            New business
          </Link>
        </Button>
      </div>

      <DataTable<Business>
        columns={columns}
        rows={rows}
        loading={loading}
        searchKeys={["name", "plan"]}
        searchPlaceholder="Search businesses…"
        emptyMessage="No businesses yet. Create your first one."
        filters={[
          {
            key: "plan",
            label: "Plan",
            options: [
              { value: "free", label: "Free" },
              { value: "basic", label: "Basic" },
              { value: "pro", label: "Pro" },
              { value: "enterprise", label: "Enterprise" },
            ],
          },
          {
            key: "is_active",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
            ],
            match: (b, v) => (v === "active" ? b.is_active : !b.is_active),
          },
        ]}
      />
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        (active
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
          : "bg-muted text-muted-foreground")
      }>
      {active ? "Active" : "Suspended"}
    </span>
  );
}
