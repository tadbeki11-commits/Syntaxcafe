"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/data-table";
import { apiFetch } from "@/lib/api";

type Device = {
  id: string;
  name: string | null;
  status: string;
  last_seen_at: string | null;
  business_name: string | null;
  branch_name: string | null;
  online: boolean;
};

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const columns: Column<Device>[] = [
  {
    key: "name",
    label: "Device",
    searchValue: (d) => `${d.name ?? ""} ${d.business_name ?? ""} ${d.branch_name ?? ""}`,
    render: (d) => (
      <div className="flex items-center gap-3">
        <span
          className={`size-2.5 shrink-0 rounded-full ${d.online ? "bg-green-500" : "bg-muted-foreground/40"}`}
          title={d.online ? "Online" : "Offline"}
        />
        <div>
          <div className="font-medium">{d.name ?? "Unnamed device"}</div>
          <div className="text-muted-foreground text-xs">
            {d.business_name ?? "—"} · {d.branch_name ?? "—"}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (d) => (
      <Badge variant="muted" className="capitalize">
        {d.status}
      </Badge>
    ),
  },
  {
    key: "last_seen_at",
    label: "Last seen",
    className: "text-muted-foreground",
    searchValue: () => "",
    render: (d) => relativeTime(d.last_seen_at),
  },
];

export default function PlatformDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [online, setOnline] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ devices: Device[]; online_count: number; total: number }>(
      "/platform/devices",
    )
      .then((d) => {
        setDevices(d.devices ?? []);
        setOnline(d.online_count ?? 0);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
        <p className="text-muted-foreground text-sm">
          {online} of {devices.length} device{devices.length === 1 ? "" : "s"} online
          (heartbeat within 5 minutes).
        </p>
      </div>

      <DataTable<Device>
        columns={columns}
        rows={devices}
        loading={loading}
        searchKeys={["name"]}
        searchPlaceholder="Search devices…"
        emptyMessage="No devices enrolled yet."
        filters={[
          {
            key: "online",
            label: "Connectivity",
            options: [
              { value: "online", label: "Online" },
              { value: "offline", label: "Offline" },
            ],
            match: (d, v) => (v === "online" ? d.online : !d.online),
          },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending" },
              { value: "revoked", label: "Revoked" },
            ],
          },
        ]}
      />
    </div>
  );
}
