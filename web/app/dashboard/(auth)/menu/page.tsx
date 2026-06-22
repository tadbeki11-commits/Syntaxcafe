"use client";

import { useEffect, useState } from "react";
import { PlusIcon, PencilIcon, Trash2Icon, UtensilsCrossedIcon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { RecipeDialog } from "@/components/menu/recipe-dialog";

type Item = {
  id: string;
  name: string;
  price: string | null;
  // The actual menu category (e.g. "Hot Drinks", "Pastries").
  category: string | null;
  // The printing/kitchen department this item routes to (e.g. "barista").
  main_category: string | null;
  type: string | null;
  is_available: boolean;
  // Quick-select notes waiters/cashiers can attach to this item on an order.
  predefined_notes?: string[];
};
// A "main category" row — i.e. a printing/kitchen department.
type Department = { id: string; name: string; slug: string };
// A real menu category — used to filter the menu in the waiter/cashier screens.
type Category = { id: string; name: string; slug: string };

export default function MenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [recipeItem, setRecipeItem] = useState<Item | null>(null);
  const [deptName, setDeptName] = useState("");
  const [catName, setCatName] = useState("");
  const [noteInput, setNoteInput] = useState("");

  function load() {
    setLoading(true);
    return Promise.all([Menu.items(), Menu.departments(), Menu.categories()])
      .then(([i, d, c]) => {
        setItems(i);
        setDepartments(d);
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
      main_category: departments[0]?.slug ?? "",
      type: "cafe",
      is_available: true,
      predefined_notes: [],
    });
    setNoteInput("");
    setOpen(true);
  }

  function addPredefinedNote() {
    if (!editing) return;
    const value = noteInput.trim().slice(0, 100);
    if (!value) return;
    const current = editing.predefined_notes ?? [];
    if (current.some((n) => n.toLowerCase() === value.toLowerCase())) {
      setNoteInput("");
      return;
    }
    setEditing({ ...editing, predefined_notes: [...current, value] });
    setNoteInput("");
  }

  function removePredefinedNote(note: string) {
    if (!editing) return;
    setEditing({
      ...editing,
      predefined_notes: (editing.predefined_notes ?? []).filter((n) => n !== note),
    });
  }

  async function save() {
    if (!editing) return;
    const body = {
      name: editing.name,
      price: editing.price ? Number(editing.price) : null,
      // Real menu category and printing department are kept distinct.
      category: editing.category?.trim() || null,
      main_category: editing.main_category || null,
      type: editing.type || "cafe",
      is_available: editing.is_available,
      predefined_notes: editing.predefined_notes ?? [],
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

  async function addDepartment() {
    if (!deptName.trim()) return;
    try {
      await Menu.createDepartment({ name: deptName.trim() });
      setDeptName("");
      toast.success("Department added");
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

  async function removeCategory(id: string) {
    if (!confirm("Delete this category? Items keep their existing category text.")) return;
    try {
      await Menu.removeCategory(id);
      toast.success("Category deleted");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const deptLabel = (slug: string | null) =>
    departments.find((d) => d.slug === slug)?.name || slug || "—";

  const itemColumns: Column<Item>[] = [
    { key: "name", label: "Name", className: "font-medium" },
    {
      key: "category",
      label: "Category",
      className: "text-muted-foreground",
      searchValue: (it) => it.category || "",
      render: (it) => it.category || "—",
    },
    {
      key: "main_category",
      label: "Department",
      className: "text-muted-foreground",
      searchValue: (it) => deptLabel(it.main_category),
      render: (it) => deptLabel(it.main_category),
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

  const departmentColumns: Column<Department>[] = [
    { key: "name", label: "Name", className: "font-medium" },
    { key: "slug", label: "Slug", className: "text-muted-foreground" },
  ];

  const categoryColumns: Column<Category>[] = [
    { key: "name", label: "Name", className: "font-medium" },
    { key: "slug", label: "Slug", className: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu"
        description="Items, categories, and printing departments for this branch."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/menu/bulk-import")}>
              <UploadIcon className="size-4" />
              Bulk import
            </Button>
            <Button onClick={openNew}>
              <PlusIcon className="size-4" />
              New item
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
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
                key: "category",
                label: "Category",
                options: categories.map((c) => ({ value: c.name, label: c.name })),
                match: (it, v) => it.category === v,
              },
              {
                key: "main_category",
                label: "Department",
                options: departments.map((d) => ({ value: d.slug, label: d.name })),
                match: (it, v) => it.main_category === v,
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
                  title="Recipe"
                  onClick={() => setRecipeItem(it)}>
                  <UtensilsCrossedIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing({ ...it, predefined_notes: it.predefined_notes ?? [] });
                    setNoteInput("");
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
            <CardContent className="pt-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Categories group items on the menu (e.g. Hot Drinks, Pastries) and
                are used as filters in the waiter and cashier order screens.
              </p>
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
            rowActions={(c) => (
              <Button variant="ghost" size="icon" onClick={() => removeCategory(c.id)}>
                <Trash2Icon className="size-4 text-destructive" />
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Departments route items to the right kitchen/bar printer (e.g.
                Barista, Kitchen). Each item is assigned a department on its form.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="New department name"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
                <Button onClick={addDepartment}>
                  <PlusIcon className="size-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
          <DataTable<Department>
            columns={departmentColumns}
            rows={departments}
            loading={loading}
            searchKeys={["name", "slug"]}
            searchPlaceholder="Search departments…"
            emptyMessage="No departments yet."
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
                  <Label>Department (printing)</Label>
                  <select
                    className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={editing.main_category ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, main_category: e.target.value })
                    }>
                    <option value="">—</option>
                    {departments.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={editing.category ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value })
                  }>
                  <option value="">—</option>
                  {/* Existing category that isn't in the managed list yet. */}
                  {editing.category &&
                    !categories.some((c) => c.name === editing.category) && (
                      <option value={editing.category}>{editing.category}</option>
                    )}
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Manage the list in the Categories tab.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Predefined notes</Label>
                <div className="flex gap-2">
                  <Input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPredefinedNote();
                      }
                    }}
                    maxLength={100}
                    placeholder="e.g. No sugar, Extra hot"
                  />
                  <Button type="button" variant="outline" onClick={addPredefinedNote}>
                    Add
                  </Button>
                </div>
                {(editing.predefined_notes?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {editing.predefined_notes!.map((note) => (
                      <span
                        key={note}
                        className="bg-muted inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
                        {note}
                        <button
                          type="button"
                          onClick={() => removePredefinedNote(note)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${note}`}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-muted-foreground text-xs">
                  Waiters and cashiers can quick-select these when adding this item to an order.
                </p>
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

      <RecipeDialog
        menuItem={recipeItem}
        open={!!recipeItem}
        onOpenChange={(v) => !v && setRecipeItem(null)}
      />
    </div>
  );
}
