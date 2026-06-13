"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceManager, type Column } from "@/components/resource-manager";
import { Inventory } from "@/lib/resources";

type Item = {
  id: string;
  name: string;
  unit: string;
  base_unit: string;
  min_quantity: number;
  stock_by_location?: { quantity: number }[];
};

const totalStock = (r: Item) =>
  (r.stock_by_location ?? []).reduce((s, x) => s + Number(x.quantity || 0), 0);

const columns: Column<Item>[] = [
  { key: "name", label: "Item", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "unit", label: "Unit" },
  { key: "stock", label: "In stock", render: (r) => `${totalStock(r)} ${r.base_unit ?? ""}` },
  { key: "min_quantity", label: "Min", render: (r) => r.min_quantity ?? 0 },
];

export default function InventoryPage() {
  return (
    <ResourceManager<Item>
      title="Inventory"
      description="Raw materials and stock for this branch."
      createLabel="New item"
      columns={columns}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "unit", label: "Unit", default: "piece" },
        { key: "base_unit", label: "Base unit", default: "piece" },
        { key: "min_quantity", label: "Min quantity", type: "number", default: 0 },
        { key: "quantity", label: "Opening quantity", type: "number", default: 0 },
      ]}
      load={Inventory.list}
      create={Inventory.create}
      remove={Inventory.remove}
      rowActions={(row, reload) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            const v = window.prompt(`Set stock quantity for "${row.name}"`, String(totalStock(row)));
            if (v == null) return;
            try {
              await Inventory.setQuantity(row.id, { quantity: Number(v) });
              toast.success("Stock updated");
              await reload();
            } catch (e: any) {
              toast.error(e.message);
            }
          }}>
          Adjust
        </Button>
      )}
    />
  );
}
