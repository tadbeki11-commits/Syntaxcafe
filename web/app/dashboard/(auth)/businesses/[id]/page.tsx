"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon, StoreIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

type Branch = { id: string; name: string; slug: string; is_active: boolean };
type Business = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_branches: number | null;
  is_active: boolean;
  owner: { username: string; name: string } | null;
  branches: Branch[];
};

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function deleteBranch(branchId: string, branchName: string) {
    if (!confirm(`Delete branch "${branchName}"? This removes its devices and cannot be undone.`)) return;
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-medium capitalize">{biz.plan}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Branch limit
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-medium">
            {biz.branches.length}
            {biz.max_branches != null ? ` / ${biz.max_branches}` : " (unlimited)"}
          </CardContent>
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
    </div>
  );
}
