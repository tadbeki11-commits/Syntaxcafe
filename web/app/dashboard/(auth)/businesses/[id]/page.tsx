"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PlusIcon,
  StoreIcon,
  Trash2Icon,
  UserPlusIcon,
  ReceiptTextIcon,
  BanknoteIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { birr } from "@/lib/format";

type Branch = { id: string; name: string; slug: string; is_active: boolean };
type User = {
  id: string;
  name: string;
  username: string | null;
  role: string;
  is_active: boolean;
  branch_id: string | null;
  branch_name: string | null;
  phone: string | null;
};
type Stats = {
  orders: number;
  revenue: number;
  orders_today: number;
  revenue_today: number;
  users: number;
  branches: number;
};
type Business = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_branches: number | null;
  is_active: boolean;
  owner: { id: string; username: string | null; name: string } | null;
  branches: Branch[];
  users: User[];
  stats: Stats;
};

// Roles a super admin may create here. Branch-scoped roles require a branch.
const BRANCH_SCOPED_ROLES = ["cashier", "kitchen_staff", "cafe_waiter"];
const ROLE_OPTIONS = [
  { value: "owner", label: "Owner (business-wide)" },
  { value: "admin", label: "Admin (business-wide)" },
  { value: "cashier", label: "Cashier (branch)" },
  { value: "kitchen_staff", label: "Kitchen staff (branch)" },
  { value: "cafe_waiter", label: "Waiter (branch)" },
];

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState("");
  const [busy, setBusy] = useState(false);

  // Add-user dialog state.
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "cashier",
    branch_id: "",
  });
  const [savingUser, setSavingUser] = useState(false);

  function load() {
    return apiFetch<Business>(`/platform/businesses/${id}`)
      .then(setBiz)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!branchName.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/platform/businesses/${id}/branches`, {
        method: "POST",
        body: JSON.stringify({ name: branchName.trim() }),
      });
      setBranchName("");
      toast.success("Branch added");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBranch(branchId: string, name: string) {
    if (!confirm(`Delete branch "${name}"? This removes its devices and cannot be undone.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/platform/businesses/${id}/branches/${branchId}`, {
        method: "DELETE",
      });
      toast.success("Branch deleted");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBusiness() {
    if (!biz) return;
    if (
      !confirm(
        `Delete "${biz.name}"? This permanently removes the business, its ${biz.branches.length} branch(es) and all of its staff. This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      await apiFetch(`/platform/businesses/${id}`, { method: "DELETE" });
      toast.success("Business deleted");
      router.push("/dashboard/businesses");
    } catch (err: any) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!biz) return;
    setBusy(true);
    try {
      await apiFetch(`/platform/businesses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !biz.is_active }),
      });
      toast.success(biz.is_active ? "Business suspended" : "Business activated");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const roleNeedsBranch = BRANCH_SCOPED_ROLES.includes(form.role);

  async function submitUser(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim() || form.password.length < 4) {
      toast.error("Username and a password of 4+ characters are required");
      return;
    }
    if (roleNeedsBranch && !form.branch_id) {
      toast.error("This role must be assigned to a branch");
      return;
    }
    setSavingUser(true);
    try {
      await apiFetch(`/platform/users`, {
        method: "POST",
        body: JSON.stringify({
          business_id: id,
          branch_id: roleNeedsBranch ? form.branch_id : null,
          name: form.name.trim() || form.username.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role,
        }),
      });
      toast.success(`User "${form.username.trim()}" created`);
      setAddUserOpen(false);
      setForm({ name: "", username: "", password: "", role: "cashier", branch_id: "" });
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingUser(false);
    }
  }

  async function toggleUser(u: User) {
    setBusy(true);
    try {
      await apiFetch(`/platform/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      toast.success(u.is_active ? "User disabled" : "User enabled");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(u: User) {
    if (!confirm(`Delete user "${u.username ?? u.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/platform/users/${u.id}`, { method: "DELETE" });
      toast.success("User deleted");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!biz) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/businesses">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{biz.name}</h1>
            <p className="text-muted-foreground text-sm">{biz.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={biz.is_active ? "outline" : "default"}
            onClick={toggleActive}
            disabled={busy}>
            {biz.is_active ? "Suspend" : "Activate"}
          </Button>
          <Button variant="destructive" onClick={deleteBusiness} disabled={busy}>
            <Trash2Icon className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Activity metrics for this business */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders"
          icon={ReceiptTextIcon}
          value={biz.stats.orders.toLocaleString()}
          sub={`${biz.stats.orders_today.toLocaleString()} today`}
        />
        <StatCard
          label="Revenue"
          icon={BanknoteIcon}
          value={birr(biz.stats.revenue)}
          sub={`${birr(biz.stats.revenue_today)} today`}
        />
        <StatCard
          label="Staff"
          icon={UsersIcon}
          value={String(biz.stats.users)}
        />
        <StatCard
          label="Branches"
          icon={StoreIcon}
          value={
            biz.max_branches != null
              ? `${biz.branches.length} / ${biz.max_branches}`
              : String(biz.branches.length)
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-medium capitalize">{biz.plan}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{biz.owner?.name ?? "—"}</div>
            <div className="text-muted-foreground text-xs">
              {biz.owner?.username}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
          <CardDescription>Each branch is an independent POS install.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addBranch} className="flex gap-2">
            <Input
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="New branch name"
            />
            <Button type="submit" disabled={busy}>
              <PlusIcon className="size-4" />
              Add
            </Button>
          </form>

          <div className="divide-y rounded-md border">
            {biz.branches.length === 0 ? (
              <div className="text-muted-foreground p-6 text-center text-sm">
                No branches yet.
              </div>
            ) : (
              biz.branches.map((br) => (
                <div key={br.id} className="flex items-center gap-3 p-3">
                  <div className="flex size-8 items-center justify-center rounded-md border">
                    <StoreIcon className="text-muted-foreground size-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{br.name}</div>
                    <div className="text-muted-foreground text-xs">{br.slug}</div>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {br.is_active ? "Active" : "Inactive"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={busy}
                    onClick={() => deleteBranch(br.id, br.name)}>
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Staff &amp; users</CardTitle>
            <CardDescription>
              People who can sign in to this business.
            </CardDescription>
          </div>
          <Button
            onClick={() => setAddUserOpen(true)}
            disabled={busy || biz.branches.length === 0}
            title={
              biz.branches.length === 0
                ? "Add a branch before creating staff"
                : undefined
            }>
            <UserPlusIcon className="size-4" />
            Add user
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            {biz.users.length === 0 ? (
              <div className="text-muted-foreground p-6 text-center text-sm">
                No users yet.
              </div>
            ) : (
              biz.users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <div className="font-medium">{u.username ?? u.name}</div>
                    {u.name !== u.username && (
                      <div className="text-muted-foreground text-xs">{u.name}</div>
                    )}
                  </div>
                  <Badge variant="muted" className="capitalize">
                    {u.role.replace("_", " ")}
                  </Badge>
                  <span className="text-muted-foreground hidden text-xs sm:inline">
                    {u.branch_name ?? "Business-wide"}
                  </span>
                  <Badge variant={u.is_active ? "success" : "muted"}>
                    {u.is_active ? "Active" : "Disabled"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => toggleUser(u)}>
                    {u.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={busy}
                    onClick={() => deleteUser(u)}>
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user to {biz.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitUser} className="space-y-4">
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
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoComplete="off"
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
                  disabled={!roleNeedsBranch}
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
                  <option value="">Select branch…</option>
                  {biz.branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingUser}>
                {savingUser ? "Creating…" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof StoreIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}
