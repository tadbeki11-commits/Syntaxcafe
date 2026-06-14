"use client";

import { useEffect, useState } from "react";
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

type Log = {
  id: string;
  actor_username: string | null;
  action: string;
  target_type: string | null;
  target_label: string | null;
  created_at: string | null;
};

// Destructive actions get a red badge; everything else is neutral.
function actionVariant(action: string): "muted" | "destructive" | "success" {
  if (action.includes("delete") || action.includes("suspend")) return "destructive";
  if (action.includes("create") || action.includes("activate")) return "success";
  return "muted";
}

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ logs: Log[] }>("/platform/audit")
      .then((d) => setLogs(d.logs ?? []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground text-sm">
          Recent platform super-admin actions, newest first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Business and branch changes across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              No activity recorded yet.
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3">
                  <Badge variant={actionVariant(l.action)} className="font-mono text-xs">
                    {l.action}
                  </Badge>
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium">{l.actor_username ?? "system"}</span>
                      {l.target_label && (
                        <>
                          {" → "}
                          <span className="text-muted-foreground capitalize">
                            {l.target_type}
                          </span>{" "}
                          <span className="font-medium">{l.target_label}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {l.created_at ? new Date(l.created_at).toLocaleString() : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
