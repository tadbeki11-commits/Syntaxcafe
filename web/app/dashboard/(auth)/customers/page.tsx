"use client";

import { Badge } from "@/components/ui/badge";
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
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "contact_name", label: "Contact name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
      ]}
      load={Organizations.list}
      create={Organizations.create}
      remove={Organizations.remove}
    />
  );
}
