"use client";

import { useEffect, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { Inventory, StockLocations } from "@/lib/resources";
import { shortDate } from "@/lib/format";

type Line = { inventory_item_id: string; quantity: string };

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [lines, setLines] = useState<Line[]>([{ inventory_item_id: "", quantity: "" }]);

  async function reload() {
    setLoading(true);
    try {
      const [t, l, i] = await Promise.all([
        Inventory.transfers(),
        StockLocations.list(),
        Inventory.list(),
      ]);
      setTransfers(t);
      setLocations(l);
      setItems(i);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, []);

  async function submit() {
    const validLines = lines
      .filter((l) => l.inventory_item_id && Number(l.quantity) > 0)
      .map((l) => ({ inventory_item_id: l.inventory_item_id, quantity: Number(l.quantity) }));
    if (!from || !to || validLines.length === 0) {
      toast.error("Pick locations and at least one item.");
      return;
    }
    try {
      await Inventory.createTransfer({ from_location_id: from, to_location_id: to, items: validLines });
      toast.success("Transfer created");
      setOpen(false);
      setLines([{ inventory_item_id: "", quantity: "" }]);
      setFrom("");
      setTo("");
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        description="Move stock between locations."
        action={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon className="size-4" />
            New transfer
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    No transfers yet.
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.from_location_name ?? locName(t.from_location_id)}</TableCell>
                    <TableCell>{t.to_location_name ?? locName(t.to_location_id)}</TableCell>
                    <TableCell>
                      <Badge variant="muted" className="capitalize">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{shortDate(t.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <select
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}>
                  <option value="">—</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <select
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}>
                  <option value="">—</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2">
                  <select
                    className="border-input h-9 flex-1 rounded-md border bg-transparent px-3 text-sm"
                    value={line.inventory_item_id}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx].inventory_item_id = e.target.value;
                      setLines(next);
                    }}>
                    <option value="">Select item…</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    className="w-24"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx].quantity = e.target.value;
                      setLines(next);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLines([...lines, { inventory_item_id: "", quantity: "" }])}>
                <PlusIcon className="size-4" />
                Add line
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Create transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
