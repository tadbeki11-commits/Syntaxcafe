"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MonitorSmartphoneIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    const branchId = getBranchId();
    if (!branchId) {
      toast.error("Select a branch first.");
      return;
    }
    setBusy(true);
    try {
      const res = await Devices.createEnrollmentCode(branchId, name || undefined);
      setCode(res.code);
      toast.success("Enrollment code generated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        description="Enroll a POS install to this branch."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphoneIcon className="size-5" />
            New device enrollment
          </CardTitle>
          <CardDescription>
            Generate a one-time code, then enter it on the desktop app's first run to
            pin that install to this branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Device name (optional)</Label>
            <Input
              placeholder="Front till"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={generate} disabled={busy}>
            {busy ? "Generating…" : "Generate enrollment code"}
          </Button>

          {code && (
            <div className="bg-muted flex items-center justify-between rounded-md border p-4">
              <div>
                <div className="text-muted-foreground text-xs">Enrollment code (valid 24h)</div>
                <div className="font-mono text-2xl tracking-widest">{code}</div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success("Copied");
                }}>
                <CopyIcon className="size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
