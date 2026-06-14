"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/data-table";
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

const columns: Column<Log>[] = [
  {
    key: "action",
    label: "Action",
    render: (l) => (
      <Badge variant={actionVariant(l.action)} className="font-mono text-xs">
        {l.action}
      </Badge>
    ),
  },
  {
    key: "actor_username",
    label: "Actor",
    searchValue: (l) => l.actor_username ?? "system",
    render: (l) => <span className="font-medium">{l.actor_username ?? "system"}</span>,
  },
  {
    key: "target_label",
    label: "Target",
    searchValue: (l) => `${l.target_type ?? ""} ${l.target_label ?? ""}`,
    render: (l) =>
      l.target_label ? (
        <span>
          <span className="text-muted-foreground capitalize">{l.target_type}</span>{" "}
          <span className="font-medium">{l.target_label}</span>
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "created_at",
    label: "When",
    className: "text-muted-foreground",
    searchValue: () => "",
    render: (l) => (l.created_at ? new Date(l.created_at).toLocaleString() : "—"),
  },
];

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ logs: Log[] }>("/platform/audit")
      .then((d) => setLogs(d.logs ?? []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground text-sm">
          Recent platform super-admin actions, newest first.
        </p>
      </div>

      <DataTable<Log>
        columns={columns}
        rows={logs}
        loading={loading}
        searchKeys={["action", "actor_username", "target_label"]}
        searchPlaceholder="Search activity…"
        emptyMessage="No activity recorded yet."
        pageSize={15}
      />
    </div>
  );
}
