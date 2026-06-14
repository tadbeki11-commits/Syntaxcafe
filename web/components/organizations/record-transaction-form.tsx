"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Organizations } from "@/lib/resources";
import { birr } from "@/lib/format";

type ServiceRow = { key: string; description: string; cost: string };

let keyCounter = 0;
const newKey = () => `svc-${++keyCounter}`;

export function RecordTransactionForm({
  orgId,
  onRecorded,
}: {
  orgId: string;
  onRecorded: () => void;
}) {
  const [services, setServices] = useState<ServiceRow[]>([
    { key: newKey(), description: "", cost: "" },
  ]);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const total = services.reduce((s, r) => s + (Number(r.cost) || 0), 0);

  function addRow() {
    setServices((prev) => [...prev, { key: newKey(), description: "", cost: "" }]);
  }
  function removeRow(key: string) {
    setServices((prev) => prev.filter((r) => r.key !== key));
  }
  function update(key: string, field: "description" | "cost", value: string) {
    setServices((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  }

  async function submit() {
    const valid = services
      .filter((r) => r.description.trim() && Number(r.cost) > 0)
      .map((r) => ({ description: r.description.trim(), cost: Number(r.cost) }));
    if (valid.length === 0) {
      toast.error("Add at least one service with a cost.");
      return;
    }
    setSaving(true);
    try {
      await Organizations.addTransaction(orgId, {
        services: valid,
        transaction_date: date ? new Date(date).toISOString() : undefined,
        notes: notes || undefined,
      });
      toast.success("Transaction recorded");
      setServices([{ key: newKey(), description: "", cost: "" }]);
      setDate("");
      setNotes("");
      onRecorded();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record service usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {services.map((r) => (
            <div key={r.key} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={r.description}
                  onChange={(e) => update(r.key, "description", e.target.value)}
                />
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">Cost (ETB)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={r.cost}
                  onChange={(e) => update(r.key, "cost", e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(r.key)}
                disabled={services.length === 1}>
                <Trash2Icon className="text-destructive size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <PlusIcon className="size-4" />
            Add service
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Date (optional)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-sm">Total</span>
          <span className="text-lg font-semibold">{birr(total)}</span>
        </div>
        <Button onClick={submit} disabled={saving}>
          {saving ? "Saving…" : "Record transaction"}
        </Button>
      </CardContent>
    </Card>
  );
}
