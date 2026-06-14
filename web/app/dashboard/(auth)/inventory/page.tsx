"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  BoxesIcon,
  CheckCircle2Icon,
  ChefHatIcon,
  ChevronRightIcon,
  CoffeeIcon,
  MapPinIcon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Inventory, StockLocations } from "@/lib/resources";

type StockEntry = {
  location_id: string;
  location_name?: string;
  quantity: number;
  min_quantity?: number;
};

type Item = {
  id: string;
  name: string;
  unit: string;
  base_unit: string;
  pieces_per_unit?: number;
  min_quantity: number;
  stock_by_location?: StockEntry[];
};

type AdjustState = {
  item: Item;
  mode: "set" | "delta";
  value: string;
  unit: "base" | "purchase";
};

type Loc = {
  id: string;
  name: string;
  slug: string;
  location_type: string;
  is_default: boolean;
};

type LocStats = { inStock: number; lowStock: number; totalItems: number };

// ── helpers ──────────────────────────────────────────────────────────────

const hasEntries = (item: Item) => (item.stock_by_location?.length ?? 0) > 0;

/** Quantity of an item held at a specific location. */
const qtyAt = (item: Item, locId: string) =>
  Number(item.stock_by_location?.find((s) => s.location_id === locId)?.quantity ?? 0);

/**
 * An item is "tracked" at a location when it has a stock row there, or when it
 * has no stock rows at all and this is the default location (mirrors the desktop
 * admin so untracked items surface in the main store).
 */
const isTrackedAt = (item: Item, loc: Loc) =>
  hasEntries(item)
    ? item.stock_by_location!.some((s) => s.location_id === loc.id)
    : loc.is_default;

const locationIcon = (loc: Pick<Loc, "name" | "slug">) => {
  const term = `${loc.name} ${loc.slug}`.toLowerCase();
  if (/store|warehouse|storage|main/.test(term))
    return <WarehouseIcon className="size-5 text-primary" />;
  if (/barista|bar|coffee|cafe/.test(term))
    return <CoffeeIcon className="size-5 text-amber-500" />;
  if (/kitchen|chef|food/.test(term))
    return <ChefHatIcon className="size-5 text-emerald-500" />;
  return <MapPinIcon className="size-5 text-blue-500" />;
};

// ── location card ────────────────────────────────────────────────────────

function LocationCard({
  loc,
  stats,
  onClick,
}: {
  loc: Loc;
  stats: LocStats;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`group cursor-pointer transition-all hover:ring-primary/40 ${
        loc.is_default ? "ring-primary/25" : ""
      }`}>
      <CardHeader className="border-b [.border-b]:pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-background p-2.5 shadow-sm transition-transform group-hover:scale-105">
              {locationIcon(loc)}
            </div>
            <div>
              <CardTitle className="text-base transition-colors group-hover:text-primary">
                {loc.name}
              </CardTitle>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {loc.location_type}
              </span>
            </div>
          </div>
          {loc.is_default && (
            <Badge variant="success" className="px-1.5 py-0 text-[10px]">
              Default
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border bg-background p-2 text-center">
            <span className="block text-[10px] font-medium uppercase text-muted-foreground">
              In Stock
            </span>
            <span className="text-lg font-bold">{stats.inStock}</span>
          </div>
          <div className="rounded-md border bg-background p-2 text-center">
            <span className="block text-[10px] font-medium uppercase text-muted-foreground">
              Tracked Items
            </span>
            <span className="text-lg font-bold">{stats.totalItems}</span>
          </div>
        </div>

        {stats.lowStock > 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangleIcon className="size-4 shrink-0" />
            <span>{stats.lowStock} item(s) below minimum stock!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4 shrink-0" />
            <span>All tracked items are healthy</span>
          </div>
        )}

        <div className="flex items-center justify-end pt-1 text-xs font-semibold text-primary transition-transform group-hover:translate-x-1">
          <span>Explore Inventory</span>
          <ChevronRightIcon className="ml-1 size-3.5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);

  // dialogs
  const [adjust, setAdjust] = useState<AdjustState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unit: "piece",
    base_unit: "piece",
    min_quantity: "0",
    quantity: "0",
  });

  async function reload() {
    setLoading(true);
    try {
      const [its, locs] = await Promise.all([Inventory.list(), StockLocations.list()]);
      setItems(its);
      setLocations(locs);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, []);

  const selectedLoc = useMemo(
    () => locations.find((l) => l.id === selectedLocId) ?? null,
    [locations, selectedLocId],
  );

  const locationStats = useMemo(() => {
    const stats: Record<string, LocStats> = {};
    for (const loc of locations) {
      let inStock = 0;
      let lowStock = 0;
      let totalItems = 0;
      for (const item of items) {
        if (!isTrackedAt(item, loc)) continue;
        totalItems++;
        const qty = qtyAt(item, loc.id);
        if (qty > 0) inStock++;
        const min = Number(item.min_quantity || 0);
        if (min > 0 && qty < min) lowStock++;
      }
      stats[loc.id] = { inStock, lowStock, totalItems };
    }
    return stats;
  }, [locations, items]);

  const totalItems = items.length;
  const totalLowStock = useMemo(
    () =>
      items.filter((i) => {
        const min = Number(i.min_quantity || 0);
        if (min <= 0) return false;
        const total = (i.stock_by_location ?? []).reduce(
          (s, x) => s + Number(x.quantity || 0),
          0,
        );
        return total < min;
      }).length,
    [items],
  );

  const locationItems = useMemo(() => {
    if (!selectedLoc) return [];
    return items.filter((item) => {
      if (!isTrackedAt(item, selectedLoc)) return false;
      if (onlyInStock && qtyAt(item, selectedLoc.id) <= 0) return false;
      return true;
    });
  }, [items, selectedLoc, onlyInStock]);

  // ── actions ──
  async function submitAdjust() {
    if (!adjust || !selectedLoc) return;
    const piecesPerUnit = Math.max(1, Number(adjust.item.pieces_per_unit || 1));
    const entered = Number(adjust.value);
    if (Number.isNaN(entered)) {
      toast.error("Enter a valid quantity.");
      return;
    }
    // Always send base units to the API; convert from purchase units when needed.
    const baseValue = adjust.unit === "purchase" ? entered * piecesPerUnit : entered;
    const body: { location_id: string; quantity?: number; delta?: number } = {
      location_id: selectedLoc.id,
    };
    if (adjust.mode === "delta") {
      if (baseValue === 0) {
        toast.error("Enter an amount to add or subtract.");
        return;
      }
      body.delta = baseValue;
    } else {
      if (baseValue < 0) {
        toast.error("Quantity can't be negative.");
        return;
      }
      body.quantity = baseValue;
    }
    try {
      await Inventory.setQuantity(adjust.item.id, body);
      toast.success("Stock updated");
      setAdjust(null);
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function submitCreate() {
    if (!selectedLoc) return;
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      await Inventory.create({
        name: form.name.trim(),
        unit: form.unit,
        base_unit: form.base_unit,
        min_quantity: Number(form.min_quantity) || 0,
        stock_by_location: [
          { location_id: selectedLoc.id, quantity: Number(form.quantity) || 0 },
        ],
      });
      toast.success("Item created");
      setCreateOpen(false);
      setForm({ name: "", unit: "piece", base_unit: "piece", min_quantity: "0", quantity: "0" });
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function removeItem(item: Item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await Inventory.remove(item.id);
      toast.success("Item deleted");
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  // ── item table columns (scoped to selected location) ──
  const columns: Column<Item>[] = [
    {
      key: "name",
      label: "Item",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "unit", label: "Unit", className: "text-muted-foreground" },
    {
      key: "quantity",
      label: "In stock (here)",
      render: (r) => {
        const qty = selectedLoc ? qtyAt(r, selectedLoc.id) : 0;
        const min = Number(r.min_quantity || 0);
        const low = min > 0 && qty < min;
        return (
          <span className={low ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
            {qty} {r.base_unit ?? ""}
            {low && (
              <Badge variant="warning" className="ml-2 px-1.5 py-0 text-[10px]">
                Low
              </Badge>
            )}
          </span>
        );
      },
    },
    { key: "min_quantity", label: "Min", render: (r) => r.min_quantity ?? 0 },
  ];

  // ── derived values for the adjust dialog ──
  const adjPieces = Math.max(1, Number(adjust?.item.pieces_per_unit || 1));
  const adjCurrent = adjust && selectedLoc ? qtyAt(adjust.item, selectedLoc.id) : 0;
  const adjEntered = Number(adjust?.value || 0) || 0;
  const adjBase = adjust?.unit === "purchase" ? adjEntered * adjPieces : adjEntered;
  const adjBaseUnit = adjust?.item.base_unit || "pieces";
  const adjPurchaseUnit = adjust?.item.unit || "box";

  // ── render ──
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock held across this branch's locations."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory/transfers">
              <ArrowLeftRightIcon className="size-4" />
              Transfer stock
            </Link>
          </Button>
        }
      />

      {selectedLoc === null ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total items"
              value={totalItems}
              icon={<BoxesIcon className="size-5" />}
            />
            <StatCard
              title="Locations"
              value={locations.length}
              icon={<WarehouseIcon className="size-5" />}
              variant="info"
            />
            <StatCard
              title="Low stock"
              value={totalLowStock}
              subtitle="below minimum"
              icon={<AlertTriangleIcon className="size-5" />}
              variant={totalLowStock > 0 ? "warning" : "success"}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold">Select an inventory location</h3>
            <p className="text-sm text-muted-foreground">
              Click a location to explore items and adjust per-location quantities.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : locations.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No stock locations yet.{" "}
                <Link
                  href="/dashboard/inventory/locations"
                  className="text-primary underline-offset-4 hover:underline">
                  Create one
                </Link>{" "}
                to start tracking inventory.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {locations.map((loc) => (
                <LocationCard
                  key={loc.id}
                  loc={loc}
                  stats={locationStats[loc.id] ?? { inStock: 0, lowStock: 0, totalItems: 0 }}
                  onClick={() => setSelectedLocId(loc.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/40 p-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedLocId(null)}>
                <ArrowLeftIcon className="size-4" />
                Back to locations
              </Button>
              <div className="hidden h-5 w-px bg-border sm:block" />
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  {locationIcon(selectedLoc)}
                </div>
                <div>
                  <h3 className="text-base font-bold">{selectedLoc.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Items available inside this location.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-semibold shadow-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="size-3.5 rounded border-border"
                />
                <span>Only in stock</span>
              </label>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4" />
                New item
              </Button>
            </div>
          </div>

          <DataTable<Item>
            columns={columns}
            rows={locationItems}
            loading={loading}
            searchKeys={["name"]}
            searchPlaceholder="Search items…"
            emptyMessage={
              onlyInStock
                ? "No items in stock at this location."
                : "No items tracked at this location yet."
            }
            rowActions={(row) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAdjust({
                      item: row,
                      mode: "set",
                      value: String(qtyAt(row, selectedLoc.id)),
                      unit: "base",
                    })
                  }>
                  Adjust
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeItem(row)}>
                  Delete
                </Button>
              </div>
            )}
          />
        </>
      )}

      {/* Adjust quantity dialog (per location) */}
      <Dialog open={adjust !== null} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update stock quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Item:</span>{" "}
                <span className="font-semibold">{adjust?.item.name}</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5">
                <PackageIcon className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">{selectedLoc?.name} —</span>{" "}
                <span className="font-semibold">
                  {adjCurrent} {adjBaseUnit}
                </span>{" "}
                <span className="text-muted-foreground">in stock</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label>What would you like to do?</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    value: "set" as const,
                    icon: RefreshCwIcon,
                    title: "Set exact quantity",
                    description: "Replace current stock",
                  },
                  {
                    value: "delta" as const,
                    icon: PlusIcon,
                    title: "Add / Subtract",
                    description: "Increase or decrease",
                  },
                ]).map((opt) => {
                  const Icon = opt.icon;
                  const active = adjust?.mode === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() =>
                        setAdjust((a) => (a ? { ...a, mode: opt.value } : a))
                      }
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-colors ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-muted bg-muted/30 hover:bg-muted/50"
                      }`}>
                      <Icon className="size-5" />
                      <div>
                        <div className="text-sm font-medium">{opt.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {opt.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {adjust?.mode === "delta"
                  ? "Quantity to add / subtract"
                  : "New total quantity"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="1"
                  min={adjust?.mode === "delta" ? undefined : 0}
                  value={adjust?.value ?? ""}
                  placeholder={
                    adjust?.mode === "delta" ? "e.g. 5 to add, -2 to remove" : ""
                  }
                  onChange={(e) =>
                    setAdjust((a) => (a ? { ...a, value: e.target.value } : a))
                  }
                  autoFocus
                />
                <select
                  value={adjust?.unit ?? "base"}
                  onChange={(e) =>
                    setAdjust((a) =>
                      a ? { ...a, unit: e.target.value as "base" | "purchase" } : a,
                    )
                  }
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="base">{adjBaseUnit}</option>
                  <option value="purchase">{adjPurchaseUnit}</option>
                </select>
              </div>

              {adjust?.mode === "delta" ? (
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                    <PlusIcon className="mr-1 size-3" />
                    positive adds
                  </span>
                  <span className="flex items-center text-destructive">
                    <MinusIcon className="mr-1 size-3" />
                    negative removes
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This replaces the current stock of {adjCurrent} {adjBaseUnit}.
                </p>
              )}

              {adjust?.unit === "purchase" && adjPieces > 1 && (
                <div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                  System will record:{" "}
                  <strong>
                    {adjBase} {adjBaseUnit}
                  </strong>
                  <br />
                  (1 {adjPurchaseUnit} = {adjPieces} {adjBaseUnit})
                </div>
              )}

              {adjust?.mode === "delta" && adjBase !== 0 && (
                <div className="rounded bg-muted/50 p-2 text-sm">
                  New total will be:{" "}
                  <strong>
                    {adjCurrent + adjBase} {adjBaseUnit}
                  </strong>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjust(null)}>
              Cancel
            </Button>
            <Button onClick={submitAdjust}>
              {adjust?.mode === "delta" ? "Update stock" : "Set quantity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New item dialog (opening stock at this location) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New item — {selectedLoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Base unit</Label>
                <Input
                  value={form.base_unit}
                  onChange={(e) => setForm({ ...form, base_unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.min_quantity}
                  onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Opening quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate}>Create item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
