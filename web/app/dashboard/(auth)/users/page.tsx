"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  name: string;
  username: string | null;
  role: string;
  is_active: boolean;
  branch_id: string | null;
  branch_name: string | null;
};
type Branch = { id: string; name: string; slug: string; is_active: boolean };
type Group = {
  business: { id: string; name: string; slug: string; plan: string; is_active: boolean } | null;
  branches: Branch[];
  users: User[];
};

// Each row is a user enriched with its owning business so the table stays flat.
type Row = User & {
  business_id: string;
  business_name: string;
  branch_label: string;
};

// Roles a super admin may create. Branch-scoped roles must be pinned to a branch.
const BRANCH_SCOPED_ROLES = ["cashier", "kitchen_staff", "cafe_waiter"];
const ROLE_OPTIONS = [
  { value: "owner", label: "Owner (business-wide)" },
  { value: "admin", label: "Admin (business-wide)" },
  { value: "cashier", label: "Cashier (branch)" },
  { value: "kitchen_staff", label: "Kitchen staff (branch)" },
  { value: "cafe_waiter", label: "Waiter (branch)" },
];

const emptyForm = {
  business_id: "",
  branch_id: "",
  role: "cashier",
  name: "",
  username: "",
  password: "",
};

export default function PlatformUsersPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reset-password dialog state. `resetTarget` holds the user being edited.
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Add-user dialog state.
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return apiFetch<{ groups: Group[]; total_users: number }>("/platform/users")
      .then((d) => {
        setGroups(d.groups ?? []);
        setTotal(d.total_users ?? 0);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedBusiness = groups.find(
    (g) => g.business?.id === form.business_id,
  );
  const roleNeedsBranch = BRANCH_SCOPED_ROLES.includes(form.role);

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_id) {
      toast.error("Select a business");
      return;
    }
    if (!form.username.trim() || form.password.length < 4) {
      toast.error("Username and a password of 4+ characters are required");
      return;
    }
    if (roleNeedsBranch && !form.branch_id) {
      toast.error("This role must be assigned to a branch");
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/platform/users", {
        method: "POST",
        body: JSON.stringify({
          business_id: form.business_id,
          branch_id: roleNeedsBranch ? form.branch_id : null,
          name: form.name.trim() || form.username.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role,
        }),
      });
      toast.success(`User "${form.username.trim()}" created`);
      setAddOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function submitReset() {
    if (!resetTarget) return;
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters long");
      return;
    }
    setResetting(true);
    try {
      await apiFetch(`/platform/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      toast.success(
        `Password reset for ${resetTarget.username ?? resetTarget.name}`,
      );
      setResetTarget(null);
      setNewPassword("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  const rows: Row[] = useMemo(
    () =>
      groups.flatMap((g) =>
        g.users.map((u) => ({
          ...u,
          business_id: g.business?.id ?? "",
          business_name: g.business?.name ?? "Platform / unassigned",
          // Branch-scoped staff show their branch; cross-branch accounts (owners,
          // super admins) have no branch_id.
          branch_label:
            u.branch_name ??
            (u.role === "super_admin" ? "Platform" : "Business-wide"),
        })),
      ),
    [groups],
  );

  const columns: Column<Row>[] = [
    {
      key: "username",
      label: "User",
      searchValue: (r) => `${r.username ?? ""} ${r.name}`,
      render: (r) => (
        <div>
          <div className="font-medium">{r.username ?? r.name}</div>
          {r.username && r.name !== r.username && (
            <div className="text-muted-foreground text-xs">{r.name}</div>
          )}
        </div>
      ),
    },
    {
      key: "business_name",
      label: "Business",
      render: (r) =>
        r.business_id ? (
          <Link
            href={`/dashboard/businesses/${r.business_id}`}
            className="hover:underline">
            {r.business_name}
          </Link>
        ) : (
          <span className="text-muted-foreground">{r.business_name}</span>
        ),
    },
    {
      key: "branch_label",
      label: "Branch",
      render: (r) =>
        r.branch_name ? (
          <span>{r.branch_name}</span>
        ) : (
          <span className="text-muted-foreground">{r.branch_label}</span>
        ),
    },
    {
      key: "role",
      label: "Role",
      render: (r) => (
        <Badge variant="muted" className="capitalize">
          {r.role}
        </Badge>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      searchValue: (r) => (r.is_active ? "active" : "inactive"),
      render: (r) => (
        <Badge variant={r.is_active ? "success" : "muted"}>
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResetTarget(r);
              setNewPassword("");
            }}>
            Reset password
          </Button>
        </div>
      ),
    },
  ];

  const businessOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => seen.set(r.business_name, r.business_name));
    return [...seen.keys()].map((name) => ({ value: name, label: name }));
  }, [rows]);

  const branchOptions = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => seen.add(r.branch_label));
    return [...seen].map((label) => ({ value: label, label }));
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm">
            {total} user{total === 1 ? "" : "s"} across {groups.length} group
            {groups.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }}>
          <PlusIcon className="size-4" />
          Add user
        </Button>
      </div>

      <DataTable<Row>
        columns={columns}
        rows={rows}
        loading={loading}
        searchKeys={["username", "business_name", "branch_label", "role"]}
        searchPlaceholder="Search users…"
        emptyMessage="No users."
        filters={[
          {
            key: "business_name",
            label: "Business",
            options: businessOptions,
          },
          {
            key: "branch_label",
            label: "Branch",
            options: branchOptions,
          },
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
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Business</label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={form.business_id}
                onChange={(e) =>
                  setForm({ ...form, business_id: e.target.value, branch_id: "" })
                }>
                <option value="">Select business…</option>
                {groups
                  .filter((g) => g.business)
                  .map((g) => (
                    <option key={g.business!.id} value={g.business!.id}>
                      {g.business!.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Branch{roleNeedsBranch ? "" : " (n/a)"}
                </label>
                <select
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-50"
                  disabled={!roleNeedsBranch || !selectedBusiness}
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
                  <option value="">Select branch…</option>
                  {selectedBusiness?.branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Abel Tesfaye"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={form.username}
                  autoComplete="off"
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="login name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="text"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="min 4 characters"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetTarget != null}
        onOpenChange={(o) => {
          if (!o) {
            setResetTarget(null);
            setNewPassword("");
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reset password
              {resetTarget
                ? ` — ${resetTarget.username ?? resetTarget.name}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">New password</label>
            <Input
              type="text"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a new password"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitReset();
              }}
            />
            <p className="text-muted-foreground text-xs">
              The user will sign in with this password immediately. They are not
              notified automatically.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetTarget(null);
                setNewPassword("");
              }}>
              Cancel
            </Button>
            <Button onClick={submitReset} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
