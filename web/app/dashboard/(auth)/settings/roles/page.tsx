"use client";

import { ResourceManager, type Column } from "@/components/resource-manager";
import { Settings } from "@/lib/resources";

type Role = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
};

const columns: Column<Role>[] = [
  { key: "display_name", label: "Role", render: (r) => <span className="font-medium">{r.display_name}</span> },
  { key: "name", label: "Key", className: "text-muted-foreground" },
  { key: "description", label: "Description" },
];

export default function RolesPage() {
  return (
    <ResourceManager<Role>
      title="Roles"
      description="Access roles available across the business."
      createLabel="New role"
      columns={columns}
      fields={[
        { key: "name", label: "Key (e.g. cashier)", required: true },
        { key: "display_name", label: "Display name", required: true },
        { key: "description", label: "Description" },
      ]}
      load={Settings.roles}
      create={Settings.createRole}
      remove={Settings.removeRole}
    />
  );
}
