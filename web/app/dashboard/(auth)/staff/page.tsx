"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceManager, type Column } from "@/components/resource-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { StaffActivity } from "@/components/staff/staff-activity";
import { Users } from "@/lib/resources";

type U = {
  id: string;
  name: string;
  full_name?: string | null;
  username: string | null;
  phone?: string | null;
  role: string;
  is_active: boolean;
};

const columns: Column<U>[] = [
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

function StaffAccounts() {
  return (
    <ResourceManager<U>
      title="Staff accounts"
      description="Employees who can sign in to the POS."
      createLabel="New staff"
      editLabel="Edit staff"
      columns={columns}
      searchKeys={["full_name", "name", "username", "role"]}
      searchPlaceholder="Search staff…"
      filters={[
        {
          key: "role",
          label: "Role",
          options: [
            { value: "admin", label: "Admin" },
            { value: "fb_manager", label: "F&B manager" },
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
        { key: "full_name", label: "Full name", required: true },
        { key: "username", label: "Username", required: true },
        { key: "password", label: "Authentication method", type: "auth", required: true, createOnly: true },
        {
          key: "role",
          label: "Role",
          type: "select",
          default: "cashier",
          createOnly: true,
          options: [
            { value: "admin", label: "Admin" },
            { value: "fb_manager", label: "F&B manager" },
            { value: "cashier", label: "Cashier" },
            { value: "kitchen_staff", label: "Kitchen staff" },
            { value: "cafe_waiter", label: "Waiter" },
          ],
        },
        { key: "phone", label: "Phone" },
      ]}
      load={Users.list}
      create={Users.create}
      update={Users.update}
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

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage POS logins and review each employee's order activity."
      />
      <Tabs defaultValue="accounts" className="space-y-5">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <StaffAccounts />
        </TabsContent>
        <TabsContent value="activity">
          <StaffActivity />
        </TabsContent>
      </Tabs>
    </div>
  );
}
