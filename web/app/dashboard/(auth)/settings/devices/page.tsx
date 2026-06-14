"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MonitorSmartphoneIcon, CopyIcon, RefreshCwIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Devices } from "@/lib/resources";
import { getBranchId } from "@/lib/api";

type EnrolledDevice = {
  id: string;
  name: string | null;
  status: string;
  last_seen_at: string | null;
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

export default function DevicesPage() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [devices, setDevices] = useState<EnrolledDevice[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [devicesLoading, setDevicesLoading] = useState(true);

  const load = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) {
      setLoading(false);
      setDevicesLoading(false);
      return;
    }
    setLoading(true);
    setDevicesLoading(true);
    try {
      const [codeRes, devicesRes] = await Promise.all([
        Devices.getEnrollmentCode(branchId),
        Devices.list(branchId),
      ]);
      setCode(codeRes.code);
      setDevices(devicesRes.devices ?? []);
      setOnlineCount(devicesRes.online_count ?? 0);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function rotate() {
    const branchId = getBranchId();
    if (!branchId) {
      toast.error("Select a branch first.");
      return;
    }
    setRotating(true);
    try {
      const res = await Devices.rotateEnrollmentCode(branchId);
      setCode(res.code);
      toast.success(
        "New enrollment code generated. The previous code no longer works.",
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        description="The enrollment code POS installs use to join this branch."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphoneIcon className="size-5" />
            Branch enrollment code
          </CardTitle>
          <CardDescription>
            Enter this code on a desktop app's first run to pin that install to this
            branch. The same code works for every device — rotate it to revoke
            access for new enrollments (already-enrolled devices stay connected).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted flex items-center justify-between rounded-md border p-4">
            <div>
              <div className="text-muted-foreground text-xs">Enrollment code</div>
              <div className="font-mono text-2xl tracking-widest">
                {loading ? "…" : code || "Not set"}
              </div>
            </div>
            {code && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success("Copied");
                }}>
                <CopyIcon className="size-4" />
              </Button>
            )}
          </div>

          <Button onClick={rotate} disabled={rotating || loading}>
            <RefreshCwIcon className="size-4" />
            {rotating
              ? "Generating…"
              : code
                ? "Rotate code"
                : "Generate enrollment code"}
          </Button>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphoneIcon className="size-5" />
            Enrolled devices
          </CardTitle>
          <CardDescription>
            {devicesLoading
              ? "Loading devices…"
              : `${onlineCount} of ${devices.length} device${
                  devices.length === 1 ? "" : "s"
                } online (heartbeat within 5 minutes).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!devicesLoading && devices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No devices enrolled to this branch yet.
            </p>
          ) : (
            <ul className="divide-y">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${
                        d.online ? "bg-green-500" : "bg-muted-foreground/40"
                      }`}
                      title={d.online ? "Online" : "Offline"}
                    />
                    <div>
                      <div className="font-medium">
                        {d.name ?? "Unnamed device"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Last seen {relativeTime(d.last_seen_at)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="muted" className="capitalize">
                    {d.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
