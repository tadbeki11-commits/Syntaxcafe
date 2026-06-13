"use client";

import { Badge } from "@/components/ui/badge";
import { ResourceManager, type Column } from "@/components/resource-manager";
import { StockLocations } from "@/lib/resources";

type Loc = {
  id: string;
  name: string;
  slug: string;
  location_type: string;
  is_default: boolean;
};

const columns: Column<Loc>[] = [
  { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "slug", label: "Slug", className: "text-muted-foreground" },
  { key: "location_type", label: "Type", render: (r) => <span className="capitalize">{r.location_type}</span> },
  {
    key: "is_default",
    label: "Default",
    render: (r) => (r.is_default ? <Badge variant="success">Default</Badge> : "—"),
  },
];

export default function StockLocationsPage() {
  return (
    <ResourceManager<Loc>
      title="Stock Locations"
      description="Where inventory is held for this branch."
      createLabel="New location"
      columns={columns}
      fields={[
        { key: "name", label: "Name", required: true },
        {
          key: "location_type",
          label: "Type",
          type: "select",
          default: "storage",
          options: [
            { value: "storage", label: "Storage" },
            { value: "service", label: "Service" },
            { value: "kitchen", label: "Kitchen" },
          ],
        },
        { key: "description", label: "Description" },
      ]}
      load={StockLocations.list}
      create={StockLocations.create}
      remove={StockLocations.remove}
    />
  );
}
