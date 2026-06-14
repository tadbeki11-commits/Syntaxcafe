"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MonitorSmartphoneIcon, CopyIcon, RefreshCwIcon } from "lucide-react";

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

export default function DevicesPage() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);

  const load = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await Devices.getEnrollmentCode(branchId);
      setCode(res.code);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
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
    </div>
  );
}
