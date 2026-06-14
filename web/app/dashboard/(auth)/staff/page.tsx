"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceManager, type Column } from "@/components/resource-manager";
import { Users } from "@/lib/resources";

type U = {
  id: string;
  name: string;
  username: string | null;
  role: string;
  is_active: boolean;
};

const columns: Column<U>[] = [
  // { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "username", label: "Username", className: "text-muted-foreground" },
  { key: "role", label: "Role", render: (r) => <Badge variant="muted" className="capitalize">{r.role}</Badge> },
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

export default function StaffPage() {
  return (
    <ResourceManager<U>
      title="Staff"
      description="Employees who can sign in to the POS."
      createLabel="New staff"
      columns={columns}
      searchKeys={["name", "username", "role"]}
      searchPlaceholder="Search staff…"
      filters={[
        {
          key: "role",
          label: "Role",
          options: [
            { value: "admin", label: "Admin" },
            { value: "cashier", label: "Cashier" },
            { value: "kitchen_staff", label: "Kitchen staff" },
            { value: "cafe_waiter", label: "Waiter" },
          ],
        },
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
        { key: "name", label: "Full name", required: true },
        { key: "username", label: "Username", required: true },
        { key: "password", label: "Password", type: "password", required: true },
        {
          key: "role",
          label: "Role",
          type: "select",
          default: "cashier",
          options: [
            { value: "admin", label: "Admin" },
            { value: "cashier", label: "Cashier" },
            { value: "kitchen_staff", label: "Kitchen staff" },
            { value: "cafe_waiter", label: "Waiter" },
          ],
        },
        { key: "phone", label: "Phone" },
      ]}
      load={Users.list}
      create={Users.create}
      rowActions={(row, reload) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await Users.toggle(row.id);
              await reload();
            } catch (e: any) {
              toast.error(e.message);
            }
          }}>
          {row.is_active ? "Deactivate" : "Activate"}
        </Button>
      )}
    />
  );
}
