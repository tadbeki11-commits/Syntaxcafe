"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  MonitorSmartphoneIcon,
  CopyIcon,
  RefreshCwIcon,
  Trash2Icon,
  Loader2Icon,
  DatabaseIcon,
  CheckIcon,
  XIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { Devices, DataCleanup } from "@/lib/resources";
import { getBranchId } from "@/lib/api";

type EnrolledDevice = {
  id: string;
  name: string | null;
  status: string;
  last_seen_at: string | null;
  online: boolean;
};

type CleanupRequest = {
  id: string;
  device_name: string | null;
  status: string;
  reason: string | null;
  requested_at: string | null;
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
  // The device the operator is about to kick out (drives the confirm dialog).
  const [toKick, setToKick] = useState<EnrolledDevice | null>(null);
  const [kicking, setKicking] = useState(false);
  const [cleanups, setCleanups] = useState<CleanupRequest[]>([]);
  const [cleanupsLoading, setCleanupsLoading] = useState(true);
  // Id of the request currently being approved/rejected (drives button spinner).
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) {
      setLoading(false);
      setDevicesLoading(false);
      setCleanupsLoading(false);
      return;
    }
    setLoading(true);
    setDevicesLoading(true);
    setCleanupsLoading(true);
    try {
      const [codeRes, devicesRes, cleanupRes] = await Promise.all([
        Devices.getEnrollmentCode(branchId),
        Devices.list(branchId),
        DataCleanup.list(branchId),
      ]);
      setCode(codeRes.code);
      setDevices(devicesRes.devices ?? []);
      setOnlineCount(devicesRes.online_count ?? 0);
      setCleanups(cleanupRes);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
      setDevicesLoading(false);
      setCleanupsLoading(false);
    }
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    setReviewingId(id);
    try {
      if (action === "approve") {
        await DataCleanup.approve(id);
        toast.success("Cleanup approved. The device will wipe once it syncs.");
      } else {
        await DataCleanup.reject(id);
        toast.success("Cleanup request rejected.");
      }
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setReviewingId(null);
    }
  }

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

  async function kick() {
    const branchId = getBranchId();
    if (!toKick || !branchId) return;
    setKicking(true);
    try {
      await Devices.remove(toKick.id, branchId);
      setDevices((prev) => {
        const next = prev.filter((d) => d.id !== toKick.id);
        setOnlineCount(next.filter((d) => d.online).length);
        return next;
      });
      toast.success(
        `${toKick.name ?? "Device"} kicked out. It will return to the enrollment screen.`,
      );
      setToKick(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setKicking(false);
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

          {code && (
            <div className="flex flex-col items-center gap-2 rounded-md border p-4">
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={code} size={176} marginSize={0} level="M" />
              </div>
              <p className="text-muted-foreground text-center text-xs">
                On a new device, open the waiter app and tap{" "}
                <span className="font-medium">Scan QR</span> to enroll without
                typing the code.
              </p>
            </div>
          )}

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
                  <div className="flex items-center gap-2">
                    <Badge variant="muted" className="capitalize">
                      {d.status}
                    </Badge>
                    <Button
                      variant="destructive"
                      size="icon"
                      title="Kick out this device"
                      onClick={() => setToKick(d)}>
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="size-5" />
            Data cleanup requests
          </CardTitle>
          <CardDescription>
            When a desktop admin requests a data cleanup, approve it here. On
            approval the device clears its local data and this branch&apos;s
            orders &amp; payments are permanently deleted. This can&apos;t be
            undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cleanupsLoading ? (
            <p className="text-muted-foreground text-sm">Loading requests…</p>
          ) : cleanups.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No cleanup requests for this branch.
            </p>
          ) : (
            <ul className="divide-y">
              {cleanups.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {r.device_name ?? "Unnamed device"}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Requested {relativeTime(r.requested_at)}
                      {r.reason ? ` · ${r.reason}` : ""}
                    </div>
                  </div>
                  {r.status === "pending" ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reviewingId === r.id}
                        onClick={() => review(r.id, "reject")}>
                        <XIcon className="size-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={reviewingId === r.id}
                        onClick={() => review(r.id, "approve")}>
                        {reviewingId === r.id ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <CheckIcon className="size-4" />
                        )}
                        Approve
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant={
                        r.status === "approved" ? "default" : "muted"
                      }
                      className="shrink-0 capitalize">
                      {r.status}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!toKick}
        onOpenChange={(open) => !open && !kicking && setToKick(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kick out this device?</DialogTitle>
            <DialogDescription>
              {toKick?.name ?? "This device"} will be removed and signed out
              immediately. It will return to the enrollment screen and needs the
              enrollment code (or a QR scan) to reconnect. This can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={kicking}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={kick} disabled={kicking}>
              {kicking ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Kicking out…
                </>
              ) : (
                <>
                  <Trash2Icon className="size-4" />
                  Kick out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
