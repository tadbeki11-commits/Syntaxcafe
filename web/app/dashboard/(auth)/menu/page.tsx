"use client";

import { useEffect, useState } from "react";
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Menu } from "@/lib/resources";
import { birr } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  price: string | null;
  category: string | null;
  main_category: string | null;
  type: string | null;
  is_available: boolean;
};
type Category = { id: string; name: string; slug: string; type: string };

export default function MenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [catName, setCatName] = useState("");

  function load() {
    setLoading(true);
    return Promise.all([Menu.items(), Menu.categories()])
      .then(([i, c]) => {
        setItems(i);
        setCategories(c);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing({
      id: "",
      name: "",
      price: "",
      category: "",
      main_category: "",
      type: "cafe",
      is_available: true,
    });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    const body = {
      name: editing.name,
      price: editing.price ? Number(editing.price) : null,
      category: editing.category || editing.main_category || null,
      main_category: editing.main_category || null,
      type: editing.type || "cafe",
      is_available: editing.is_available,
    };
    try {
      if (editing.id) await Menu.update(editing.id, body);
      else await Menu.create(body);
      toast.success("Saved");
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await Menu.remove(id);
      toast.success("Deleted");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function toggle(id: string) {
    try {
      await Menu.toggle(id);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function addCategory() {
    if (!catName.trim()) return;
    try {
      await Menu.createCategory({ name: catName.trim() });
      setCatName("");
      toast.success("Category added");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const itemColumns: Column<Item>[] = [
    { key: "name", label: "Name", className: "font-medium" },
    {
      key: "category",
      label: "Category",
      className: "text-muted-foreground",
      searchValue: (it) => it.main_category || it.category || "",
      render: (it) => it.main_category || it.category || "—",
    },
    { key: "price", label: "Price", render: (it) => birr(it.price) },
    {
      key: "is_available",
      label: "Available",
      render: (it) => (
        <Switch checked={!!it.is_available} onCheckedChange={() => toggle(it.id)} />
      ),
    },
  ];

  const categoryColumns: Column<Category>[] = [
    { key: "name", label: "Name", className: "font-medium" },
    { key: "slug", label: "Slug", className: "text-muted-foreground" },
    {
      key: "type",
      label: "Type",
      render: (c) => (
        <Badge variant="muted" className="capitalize">
          {c.type}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu"
        description="Items and categories for this branch."
        action={
          <Button onClick={openNew}>
            <PlusIcon className="size-4" />
            New item
          </Button>
        }
      />

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <DataTable<Item>
            columns={itemColumns}
            rows={items}
            loading={loading}
            searchKeys={["name", "category"]}
            searchPlaceholder="Search items…"
            emptyMessage="No menu items. Add your first item."
            filters={[
              {
                key: "main_category",
                label: "Category",
                options: categories.map((c) => ({ value: c.slug, label: c.name })),
                match: (it, v) => it.main_category === v || it.category === v,
              },
              {
                key: "is_available",
                label: "Availability",
                options: [
                  { value: "available", label: "Available" },
                  { value: "unavailable", label: "Unavailable" },
                ],
                match: (it, v) =>
                  v === "available" ? !!it.is_available : !it.is_available,
              },
            ]}
            rowActions={(it) => (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(it);
                    setOpen(true);
                  }}>
                  <PencilIcon className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(it.id)}>
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
                <Button onClick={addCategory}>
                  <PlusIcon className="size-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
          <DataTable<Category>
            columns={categoryColumns}
            rows={categories}
            loading={loading}
            searchKeys={["name", "slug"]}
            searchPlaceholder="Search categories…"
            emptyMessage="No categories yet."
          />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit item" : "New item"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (ETB)</Label>
                  <Input
                    type="number"
                    value={editing.price ?? ""}
                    onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={editing.main_category ?? ""}
                    onChange={(e) => setEditing({ ...editing, main_category: e.target.value })}>
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editing.is_available}
                  onCheckedChange={(v) => setEditing({ ...editing, is_available: v })}
                />
                <Label>Available</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
