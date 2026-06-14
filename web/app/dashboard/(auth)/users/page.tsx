"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StoreIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  name: string;
  username: string | null;
  role: string;
  is_active: boolean;
};
type Branch = { id: string; name: string; slug: string; is_active: boolean };
type Group = {
  business: { id: string; name: string; slug: string; plan: string; is_active: boolean } | null;
  branches: Branch[];
  users: User[];
};

export default function PlatformUsersPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ groups: Group[]; total_users: number }>("/platform/users")
      .then((d) => {
        setGroups(d.groups ?? []);
        setTotal(d.total_users ?? 0);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          {total} user{total === 1 ? "" : "s"} across {groups.length} group
          {groups.length === 1 ? "" : "s"}, divided by business.
        </p>
      </div>

      {groups.map((g) => (
        <Card key={g.business?.id ?? "unassigned"}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {g.business ? (
                    <Link
                      href={`/dashboard/businesses/${g.business.id}`}
                      className="hover:underline">
                      {g.business.name}
                    </Link>
                  ) : (
                    "Platform / unassigned"
                  )}
                  {g.business && (
                    <Badge variant="muted" className="capitalize">
                      {g.business.plan}
                    </Badge>
                  )}
                  {g.business && !g.business.is_active && (
                    <Badge variant="muted">Suspended</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {g.users.length} user{g.users.length === 1 ? "" : "s"}
                  {g.business ? ` · ${g.branches.length} branch${g.branches.length === 1 ? "" : "es"}` : ""}
                </CardDescription>
              </div>
            </div>

            {g.branches.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {g.branches.map((br) => (
                  <span
                    key={br.id}
                    className="text-muted-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
                    <StoreIcon className="size-3" />
                    {br.name}
                    {!br.is_active && <span className="opacity-60">(inactive)</span>}
                  </span>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent>
            {g.users.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center text-sm">
                No users.
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                {g.users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1">
                      <div className="font-medium">{u.username ?? u.name}</div>
                      {u.username && u.name !== u.username && (
                        <div className="text-muted-foreground text-xs">{u.name}</div>
                      )}
                    </div>
                    <Badge variant="muted" className="capitalize">
                      {u.role}
                    </Badge>
                    <Badge variant={u.is_active ? "success" : "muted"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
