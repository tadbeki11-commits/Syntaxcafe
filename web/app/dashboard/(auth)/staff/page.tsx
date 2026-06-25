"use client";

import Link from "next/link";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceManager, type Column } from "@/components/resource-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { StaffActivity } from "@/components/staff/staff-activity";
import { CashierDepartmentsAction } from "@/components/staff/cashier-departments-action";
import { ManageAccessAction } from "@/components/staff/manage-access-action";
import { Users } from "@/lib/resources";
import { CONFIGURABLE_ROLES } from "@/lib/permissions";

// Selectable roles for staff accounts, sourced from the shared RBAC list so the
// dropdown and the permission editor stay in sync.
const ROLE_OPTIONS = CONFIGURABLE_ROLES.map((r) => ({ value: r.value, label: r.label }));

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
          options: ROLE_OPTIONS,
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
          options: ROLE_OPTIONS,
        },
        { key: "phone", label: "Phone" },
      ]}
      load={Users.list}
      create={Users.create}
      update={Users.update}
      rowActions={(row, reload) => (
        <>
          {row.role === "cashier" ? (
            <CashierDepartmentsAction
              userId={row.id}
              userName={row.full_name || row.name || row.username || "Cashier"}
            />
          ) : null}
          <ManageAccessAction
            userId={row.id}
            userName={row.full_name || row.name || row.username || "Staff"}
            currentRole={row.role}
            onSaved={reload}
          />
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
        </>
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
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/staff/bulk-import">
              <UploadIcon className="size-4" />
              Bulk import
            </Link>
          </Button>
        }
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
