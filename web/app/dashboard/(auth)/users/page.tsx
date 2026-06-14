"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

export default function PlatformUsersPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reset-password dialog state. `resetTarget` holds the user being edited.
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

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
    apiFetch<{ groups: Group[]; total_users: number }>("/platform/users")
      .then((d) => {
        setGroups(d.groups ?? []);
        setTotal(d.total_users ?? 0);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          {total} user{total === 1 ? "" : "s"} across {groups.length} group
          {groups.length === 1 ? "" : "s"}.
        </p>
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
