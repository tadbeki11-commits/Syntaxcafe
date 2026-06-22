import React from 'react';
import toast from 'react-hot-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MenuItem, MenuFormData } from '../types';
import { RecipeTab } from './RecipeTab';
import type { LocalRecipe, LocalRecipeIngredient } from '@/db/types';

interface MenuFormDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectedItem: MenuItem | null;
  formData: MenuFormData;
  setFormData: React.Dispatch<React.SetStateAction<MenuFormData>>;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  availableCategories: string[];
  mainCategories: Array<{ name: string; slug: string }>;
  onAddMainCategory: (name: string) => Promise<{ name: string; slug: string } | null>;
  // Recipe props (only required when editing)
  existingRecipe?: LocalRecipe | null;
  inventoryItems?: any[];
  stockLocations?: any[];
  onSaveRecipe?: (payload: {
    name: string;
    yield_quantity: number;
    deduct_strategy: string;
    deduct_from_location_id?: number | null;
    is_active: boolean;
    ingredients: Partial<LocalRecipeIngredient>[];
  }) => Promise<void>;
  onDeleteRecipe?: () => Promise<void>;
}

export const MenuFormDialog: React.FC<MenuFormDialogProps> = ({
  dialogOpen,
  setDialogOpen,
  selectedItem,
  formData,
  setFormData,
  handleSubmit,
  availableCategories,
  mainCategories,
  onAddMainCategory,
  existingRecipe,
  inventoryItems = [],
  stockLocations = [],
  onSaveRecipe,
  onDeleteRecipe,
}) => {
  const [newMainCategoryName, setNewMainCategoryName] = React.useState('');
  const [addingMainCategory, setAddingMainCategory] = React.useState(false);
  const [newNote, setNewNote] = React.useState('');
  const predefinedNotes = formData.predefined_notes ?? [];

  const addPredefinedNote = () => {
    const value = newNote.trim().slice(0, 100);
    if (!value) return;
    if (predefinedNotes.some((note) => note.toLowerCase() === value.toLowerCase())) {
      setNewNote('');
      return;
    }
    setFormData((p) => ({ ...p, predefined_notes: [...(p.predefined_notes ?? []), value] }));
    setNewNote('');
  };

  const removePredefinedNote = (note: string) => {
    setFormData((p) => ({
      ...p,
      predefined_notes: (p.predefined_notes ?? []).filter((n) => n !== note),
    }));
  };
  const suggestedCategories = availableCategories.filter(Boolean);
  const [categoryMode, setCategoryMode] = React.useState<'existing' | 'custom'>(
    suggestedCategories.includes(formData.category) ? 'existing' : 'custom',
  );
  const prevDialogOpenRef = React.useRef(dialogOpen);

  React.useEffect(() => {
    if (dialogOpen && !prevDialogOpenRef.current) {
      setCategoryMode(suggestedCategories.includes(formData.category) ? 'existing' : 'custom');
    }
    prevDialogOpenRef.current = dialogOpen;
  }, [dialogOpen, suggestedCategories, formData.category]);

  const formatMainCategoryLabel = (entry: { name: string; slug: string }) => {
    const raw = String(entry?.name || entry?.slug || '').trim();
    if (!raw) return '';
    return raw.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const handleCreateMainCategory = async () => {
    const name = newMainCategoryName.trim();
    if (!name) {
      toast.error('Enter a main category name');
      return;
    }
    setAddingMainCategory(true);
    try {
      const created = await onAddMainCategory(name);
      if (created) setNewMainCategoryName('');
    } finally {
      setAddingMainCategory(false);
    }
  };

  const isEditing = Boolean(selectedItem);
  const showRecipeTab = isEditing && Boolean(onSaveRecipe);

  const detailsForm = (
    <form id="menu-item-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Price (Birr)</Label>
        <Input
          value={formData.price}
          onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value.replace(/[^\d]/g, '') }))}
          inputMode="numeric"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Main Category (Printing Dept)</Label>
        <Select
          value={formData.main_category || mainCategories[0]?.slug || 'barista'}
          onValueChange={(value) => setFormData((p) => ({ ...p, main_category: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select main category" />
          </SelectTrigger>
          <SelectContent>
            {mainCategories.map((entry) => (
              <SelectItem key={entry.slug} value={entry.slug}>
                {formatMainCategoryLabel(entry)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          Determines which printer/receipt this item belongs to.
        </p>

        <div className="flex gap-2">
          <Input
            value={newMainCategoryName}
            onChange={(e) => setNewMainCategoryName(e.target.value)}
            placeholder="Add new main category"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleCreateMainCategory}
            disabled={addingMainCategory}
          >
            {addingMainCategory ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="main_category">Category</Label>
          {suggestedCategories.length > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground">
              Pick existing or type a new value
            </span>
          )}
        </div>
        <div className="flex gap-2 rounded-2xl bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setCategoryMode('existing')}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${categoryMode === 'existing'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Existing
          </button>
          <button
            type="button"
            onClick={() => setCategoryMode('custom')}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${categoryMode === 'custom'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            New value
          </button>
        </div>

        {categoryMode === 'existing' && suggestedCategories.length > 0 ? (
          <Select
            value={suggestedCategories.includes(formData.category) ? formData.category : suggestedCategories[0]}
            onValueChange={(value) => setFormData((p) => ({ ...p, category: value }))}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {suggestedCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="main_category"
            value={formData.category}
            onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
            placeholder="Type a new category value"
            required
          />
        )}

        <p className="text-xs text-muted-foreground">
          Existing categories are loaded from your current menu items.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tags / extra categories</Label>
        <Input
          value={formData.tags}
          onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
          placeholder="Cold Drinks, Popular, Seasonal"
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple category tags with commas.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Predefined notes</Label>
        <div className="flex gap-2">
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
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
        {predefinedNotes.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {predefinedNotes.map((note) => (
              <span
                key={note}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {note}
                <button
                  type="button"
                  onClick={() => removePredefinedNote(note)}
                  className="text-muted-foreground/70 transition-colors hover:text-destructive"
                  aria-label={`Remove ${note}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Waiters and cashiers can quick-select these when adding this item to an order.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_available"
          checked={formData.is_available}
          onChange={(e) => setFormData((p) => ({ ...p, is_available: e.target.checked }))}
          className="rounded"
        />
        <Label htmlFor="is_available" className="cursor-pointer">
          Available for ordering
        </Label>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
          Cancel
        </Button>
        <Button type="submit">{selectedItem ? 'Update Item' : 'Create Item'}</Button>
      </DialogFooter>
    </form>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
        </DialogHeader>

        {showRecipeTab ? (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="recipe" className="relative">
                Recipe / BOM
                {!existingRecipe && (
                  <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              {detailsForm}
            </TabsContent>

            <TabsContent value="recipe">
              <RecipeTab
                menuItemId={String(selectedItem!.id)}
                menuItemName={selectedItem!.name}
                existingRecipe={existingRecipe ?? null}
                inventoryItems={inventoryItems}
                stockLocations={stockLocations}
                onSave={onSaveRecipe!}
                onDelete={onDeleteRecipe ?? (() => Promise.resolve())}
              />
            </TabsContent>
          </Tabs>
        ) : (
          detailsForm
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MenuFormDialog;
