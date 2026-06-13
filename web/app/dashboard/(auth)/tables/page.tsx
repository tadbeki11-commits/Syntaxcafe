"use client";

import { Badge } from "@/components/ui/badge";
import { ResourceManager, type Column } from "@/components/resource-manager";
import { Tables } from "@/lib/resources";

type T = { id: string; table_number: number; status: string };

const columns: Column<T>[] = [
  {
    key: "table_number",
    label: "Table",
    render: (r) => <span className="font-medium">#{r.table_number}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <Badge variant={r.status === "available" ? "success" : "muted"} className="capitalize">
        {r.status}
      </Badge>
    ),
  },
];

export default function TablesPage() {
  return (
    <ResourceManager<T>
      title="Tables"
      description="Dining tables for this branch."
      createLabel="New table"
      columns={columns}
      fields={[{ key: "table_number", label: "Table number", type: "number", required: true }]}
      load={Tables.list}
      create={Tables.create}
      remove={Tables.remove}
    />
  );
}
