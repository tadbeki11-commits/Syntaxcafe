import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LocalRecipe, LocalRecipeIngredient } from '@/db/types';

interface RecipeTabProps {
  menuItemId: string;
  menuItemName: string;
  existingRecipe: LocalRecipe | null;
  inventoryItems: any[];
  stockLocations: any[];
  onSave: (payload: {
    name: string;
    yield_quantity: number;
    deduct_strategy: string;
    deduct_from_location_id?: number | null;
    is_active: boolean;
    ingredients: Partial<LocalRecipeIngredient>[];
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}

interface IngredientRow {
  key: string;
  inventory_item_id: string;
  quantity: string;
  waste_factor: string;
  is_optional: boolean;
  notes: string;
}

const STRATEGIES = [
  { value: 'by_menu_category', label: 'By Menu Category (auto)' },
  { value: 'fixed_location', label: 'Fixed Location' },
  { value: 'default_location', label: 'Default Location' },
];

let keyCounter = 0;
const newKey = () => `ing-${++keyCounter}`;

export const RecipeTab: React.FC<RecipeTabProps> = ({
  menuItemId,
  menuItemName,
  existingRecipe,
  inventoryItems,
  stockLocations,
  onSave,
  onDelete,
}) => {
  const [recipeName, setRecipeName] = useState('');
  const [yieldQty, setYieldQty] = useState('1');
  const [strategy, setStrategy] = useState('by_menu_category');
  const [fixedLocationId, setFixedLocationId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Hydrate from existing recipe
  useEffect(() => {
    if (existingRecipe) {
      setRecipeName(existingRecipe.name || menuItemName);
      setYieldQty(String(existingRecipe.yield_quantity ?? 1));
      setStrategy(existingRecipe.deduct_strategy ?? 'by_menu_category');
      setFixedLocationId(existingRecipe.deduct_from_location_id ? String(existingRecipe.deduct_from_location_id) : '');
      setIsActive(existingRecipe.is_active !== false);
      setIngredients(
        (existingRecipe.ingredients ?? []).map((ing) => ({
          key: newKey(),
          inventory_item_id: ing.inventory_item_id ?? '',
          quantity: String(ing.quantity ?? ''),
          waste_factor: String(ing.waste_factor ?? '1.000'),
          is_optional: Boolean(ing.is_optional),
          notes: ing.notes ?? '',
        }))
      );
    } else {
      setRecipeName(menuItemName);
      setYieldQty('1');
      setStrategy('by_menu_category');
      setFixedLocationId('');
      setIsActive(true);
      setIngredients([]);
    }
  }, [existingRecipe, menuItemName]);

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { key: newKey(), inventory_item_id: '', quantity: '', waste_factor: '1.000', is_optional: false, notes: '' },
    ]);
  };

  const removeIngredient = (key: string) => {
    setIngredients((prev) => prev.filter((i) => i.key !== key));
  };

  const updateIngredient = (key: string, field: keyof IngredientRow, value: any) => {
    setIngredients((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i))
    );
  };

  const filteredInventory = inventoryItems.filter((item) =>
    !searchQuery || item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validIngredients = ingredients.filter(
      (i) => i.inventory_item_id !== '' && Number(i.quantity) > 0
    );
    setSaving(true);
    try {
      await onSave({
        name: recipeName || menuItemName,
        yield_quantity: Math.max(1, parseInt(yieldQty, 10) || 1),
        deduct_strategy: strategy,
        deduct_from_location_id: strategy === 'fixed_location' && fixedLocationId ? Number(fixedLocationId) : null,
        is_active: isActive,
        ingredients: validIngredients.map((i, idx) => ({
          inventory_item_id: i.inventory_item_id,
          quantity: Math.round(parseFloat(i.quantity) * 1000) / 1000,
          waste_factor: i.waste_factor || '1.000',
          is_optional: i.is_optional,
          notes: i.notes || null,
          display_order: idx,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header status */}
      {existingRecipe ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Recipe configured</span>
          <span className="ml-auto text-xs text-muted-foreground">{existingRecipe.ingredients?.length ?? 0} ingredient(s)</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-warning/10 px-3 py-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-warning dark:text-amber-400 font-medium">No recipe yet — stock won't auto-deduct</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Recipe metadata */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Recipe Name</Label>
            <Input
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder={menuItemName}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Yield (servings)</Label>
            <Input
              type="number"
              min="1"
              value={yieldQty}
              onChange={(e) => setYieldQty(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Deduction strategy */}
        <div className="space-y-1.5">
          <Label className="text-xs">Stock Deduction Strategy</Label>
          <Select value={strategy} onValueChange={setStrategy}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRATEGIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fixed location picker */}
        {strategy === 'fixed_location' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Deduct From Location</Label>
            <Select value={fixedLocationId} onValueChange={setFixedLocationId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select location…" />
              </SelectTrigger>
              <SelectContent>
                {stockLocations.map((loc: any) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <input
            id="recipe-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="recipe-active" className="text-xs cursor-pointer">Active (deduct on sale)</Label>
        </div>

        {/* Ingredients list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Ingredients</Label>
            <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="h-7 text-xs px-2">
              + Add
            </Button>
          </div>

          {ingredients.length === 0 && (
            <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
              No ingredients yet. Click "+ Add" to begin.
            </p>
          )}

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {ingredients.map((ing, idx) => (
              <div key={ing.key} className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">#{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing.key)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px]">Inventory Item</Label>
                    <Select
                      value={ing.inventory_item_id !== '' ? String(ing.inventory_item_id) : ''}
                      onValueChange={(v) => updateIngredient(ing.key, 'inventory_item_id', Number(v))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select item…" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-1">
                          <Input
                            placeholder="Search…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-6 text-xs mb-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {filteredInventory.map((item: any) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} ({item.base_unit ?? item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Qty (base units)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 250"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(ing.key, 'quantity', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Waste factor</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.001"
                      placeholder="1.000"
                      value={ing.waste_factor}
                      onChange={(e) => updateIngredient(ing.key, 'waste_factor', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`opt-${ing.key}`}
                    checked={ing.is_optional}
                    onChange={(e) => updateIngredient(ing.key, 'is_optional', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`opt-${ing.key}`} className="text-[10px] cursor-pointer text-muted-foreground">Optional</Label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? 'Saving…' : existingRecipe ? 'Update Recipe' : 'Create Recipe'}
          </Button>
          {existingRecipe && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={saving}
              className="px-3"
            >
              Delete
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RecipeTab;
