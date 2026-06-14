"use client";

import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResourceManager, type Column } from "@/components/resource-manager";
import { Organizations } from "@/lib/resources";
import { birr } from "@/lib/format";

type Org = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  credit_balance: string;
  is_active: boolean;
};

const columns: Column<Org>[] = [
  { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "contact_name", label: "Contact" },
  { key: "phone", label: "Phone" },
  { key: "credit_balance", label: "Credit", render: (r) => birr(r.credit_balance) },
  {
    key: "is_active",
    label: "Status",
    render: (r) => (
      <Badge variant={r.is_active ? "success" : "muted"}>
        {r.is_active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export default function CustomersPage() {
  return (
    <ResourceManager<Org>
      title="Customers"
      description="Corporate / credit accounts (organizations)."
      createLabel="New customer"
      columns={columns}
      searchKeys={["name", "contact_name", "phone"]}
      searchPlaceholder="Search customers…"
      filters={[
        {
          key: "is_active",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
          match: (r, v) => (v === "active" ? r.is_active : !r.is_active),
        },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "contact_name", label: "Contact name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "address", label: "Address" },
        { key: "notes", label: "Notes" },
      ]}
      load={Organizations.list}
      create={Organizations.create}
      update={Organizations.update}
      remove={Organizations.remove}
      rowActions={(r) => (
        <Button variant="ghost" size="icon" asChild title="Open account">
          <Link href={`/dashboard/customers/${r.id}`}>
            <ArrowUpRightIcon className="size-4" />
          </Link>
        </Button>
      )}
    />
  );
}
