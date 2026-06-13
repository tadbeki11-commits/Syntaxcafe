"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

type Business = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_branches: number | null;
  is_active: boolean;
  branch_count: number;
};

export default function BusinessesPage() {
  const [rows, setRows] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Business[]>("/platform/businesses")
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground text-sm">
            Owners and their cafes across the platform.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/businesses/new">
            <PlusIcon className="size-4" />
            New business
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Branches</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3" colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    className="text-muted-foreground px-4 py-10 text-center"
                    colSpan={4}>
                    No businesses yet. Create your first one.
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/businesses/${b.id}`}
                        className="font-medium hover:underline">
                        {b.name}
                      </Link>
                      <div className="text-muted-foreground text-xs">{b.slug}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{b.plan}</td>
                    <td className="px-4 py-3">
                      {b.branch_count}
                      {b.max_branches != null && (
                        <span className="text-muted-foreground"> / {b.max_branches}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={b.is_active} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        (active
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
          : "bg-muted text-muted-foreground")
      }>
      {active ? "Active" : "Suspended"}
    </span>
  );
}
