"use client";

import { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Recipes, Inventory, StockLocations } from "@/lib/resources";

type MenuItem = { id: string; name: string };

type IngredientRow = {
  key: string;
  inventory_item_id: string;
  quantity: string;
  waste_factor: string;
  is_optional: boolean;
  notes: string;
};

const STRATEGIES = [
  { value: "by_menu_category", label: "By Menu Category (auto)" },
  { value: "fixed_location", label: "Fixed Location" },
  { value: "default_location", label: "Default Location" },
];

let keyCounter = 0;
const newKey = () => `ing-${++keyCounter}`;

export function RecipeDialog({
  menuItem,
  open,
  onOpenChange,
  onSaved,
}: {
  menuItem: MenuItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [yieldQty, setYieldQty] = useState("1");
  const [strategy, setStrategy] = useState("by_menu_category");
  const [fixedLocationId, setFixedLocationId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);

  // Load reference data + the existing recipe whenever the dialog opens.
  useEffect(() => {
    if (!open || !menuItem) return;
    setLoading(true);
    Promise.all([
      Recipes.forMenuItem(menuItem.id).catch(() => null),
      Inventory.list().catch(() => []),
      StockLocations.list().catch(() => []),
    ])
      .then(([recipe, inv, locs]) => {
        setInventory(inv);
        setLocations(locs);
        if (recipe) {
          setRecipeId(recipe.id);
          setName(recipe.name || menuItem.name);
          setYieldQty(String(recipe.yield_quantity ?? 1));
          setStrategy(recipe.deduct_strategy ?? "by_menu_category");
          setFixedLocationId(
            recipe.deduct_from_location_id
              ? String(recipe.deduct_from_location_id)
              : "",
          );
          setIsActive(recipe.is_active !== false);
          setIngredients(
            (recipe.ingredients ?? []).map((ing: any) => ({
              key: newKey(),
              inventory_item_id: ing.inventory_item_id
                ? String(ing.inventory_item_id)
                : "",
              quantity: String(ing.quantity ?? ""),
              waste_factor: String(ing.waste_factor ?? "1.000"),
              is_optional: Boolean(ing.is_optional),
              notes: ing.notes ?? "",
            })),
          );
        } else {
          setRecipeId(null);
          setName(menuItem.name);
          setYieldQty("1");
          setStrategy("by_menu_category");
          setFixedLocationId("");
          setIsActive(true);
          setIngredients([]);
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [open, menuItem]);

  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      {
        key: newKey(),
        inventory_item_id: "",
        quantity: "",
        waste_factor: "1.000",
        is_optional: false,
        notes: "",
      },
    ]);
  }
  function removeIngredient(key: string) {
    setIngredients((prev) => prev.filter((i) => i.key !== key));
  }
  function updateIngredient(key: string, field: keyof IngredientRow, value: any) {
    setIngredients((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)),
    );
  }

  async function save() {
    if (!menuItem) return;
    const validIngredients = ingredients.filter(
      (i) => i.inventory_item_id !== "" && Number(i.quantity) > 0,
    );
    if (validIngredients.length === 0) {
      toast.error("Add at least one ingredient with a quantity.");
      return;
    }
    const payload = {
      menu_item_id: menuItem.id,
      name: name || menuItem.name,
      yield_quantity: Math.max(1, parseInt(yieldQty, 10) || 1),
      deduct_strategy: strategy,
      deduct_from_location_id:
        strategy === "fixed_location" && fixedLocationId
          ? fixedLocationId
          : null,
      is_active: isActive,
      ingredients: validIngredients.map((i, idx) => ({
        inventory_item_id: i.inventory_item_id,
        quantity: Math.round(parseFloat(i.quantity) * 1000) / 1000,
        waste_factor: i.waste_factor || "1.000",
        is_optional: i.is_optional,
        notes: i.notes || null,
        display_order: idx,
      })),
    };
    setSaving(true);
    try {
      if (recipeId) await Recipes.update(recipeId, payload);
      else await Recipes.create(payload);
      toast.success("Recipe saved");
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecipe() {
    if (!recipeId) return;
    if (!confirm("Delete this recipe? Stock will no longer auto-deduct.")) return;
    setSaving(true);
    try {
      await Recipes.remove(recipeId);
      toast.success("Recipe deleted");
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recipe — {menuItem?.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                recipeId
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-600"
              }`}>
              {recipeId
                ? `Recipe configured — ${ingredients.length} ingredient(s)`
                : "No recipe yet — stock won't auto-deduct on sale"}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Recipe name</Label>
                <Input
                  value={name}
                  placeholder={menuItem?.name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Yield (servings)</Label>
                <Input
                  type="number"
                  min="1"
                  value={yieldQty}
                  onChange={(e) => setYieldQty(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stock deduction strategy</Label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}>
                {STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {strategy === "fixed_location" && (
              <div className="space-y-2">
                <Label>Deduct from location</Label>
                <select
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={fixedLocationId}
                  onChange={(e) => setFixedLocationId(e.target.value)}>
                  <option value="">Select location…</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active (deduct on sale)</Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Ingredients</Label>
                <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                  <PlusIcon className="size-4" />
                  Add
                </Button>
              </div>

              {ingredients.length === 0 && (
                <p className="text-muted-foreground rounded-md border border-dashed py-4 text-center text-xs">
                  No ingredients yet. Click "Add" to begin.
                </p>
              )}

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {ingredients.map((ing, idx) => (
                  <div key={ing.key} className="bg-muted/30 space-y-2 rounded-lg border p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs font-medium">
                        #{idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => removeIngredient(ing.key)}>
                        <Trash2Icon className="text-destructive size-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Inventory item</Label>
                      <select
                        className="border-input h-8 w-full rounded-md border bg-transparent px-2 text-sm"
                        value={ing.inventory_item_id}
                        onChange={(e) =>
                          updateIngredient(ing.key, "inventory_item_id", e.target.value)
                        }>
                        <option value="">Select item…</option>
                        {inventory.map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.name}
                            {item.base_unit || item.unit
                              ? ` (${item.base_unit ?? item.unit})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Qty (base units)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="e.g. 250"
                          value={ing.quantity}
                          onChange={(e) =>
                            updateIngredient(ing.key, "quantity", e.target.value)
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Waste factor</Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.001"
                          placeholder="1.000"
                          value={ing.waste_factor}
                          onChange={(e) =>
                            updateIngredient(ing.key, "waste_factor", e.target.value)
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={ing.is_optional}
                        onChange={(e) =>
                          updateIngredient(ing.key, "is_optional", e.target.checked)
                        }
                        className="rounded"
                      />
                      <span className="text-muted-foreground">Optional</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {recipeId ? (
            <Button variant="destructive" onClick={deleteRecipe} disabled={saving}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || loading}>
              {saving ? "Saving…" : recipeId ? "Update recipe" : "Create recipe"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
