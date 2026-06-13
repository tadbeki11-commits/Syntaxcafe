import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  LOCATION_TYPE_OPTIONS,
  StockLocationFormData,
  nameToSlug,
} from '../types';

interface LocationFormDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectedLocation: { id: string } | null;
  formData: StockLocationFormData;
  setFormData: React.Dispatch<React.SetStateAction<StockLocationFormData>>;
  mainCategories: Array<{ name: string; slug: string }>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const LocationFormDialog: React.FC<LocationFormDialogProps> = ({
  dialogOpen,
  setDialogOpen,
  selectedLocation,
  formData,
  setFormData,
  mainCategories,
  saving,
  onSubmit,
}) => {
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedLocation ? 'Edit Stock Location' : 'Add Stock Location'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location_name">Name</Label>
            <Input
              id="location_name"
              value={formData.name}
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  name: value,
                  slug: selectedLocation ? prev.slug : nameToSlug(value),
                }));
              }}
              placeholder="e.g. Kitchen Walk-in"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_slug">Slug</Label>
            <Input
              id="location_slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: nameToSlug(e.target.value) }))
              }
              placeholder="e.g. kitchen-walk-in"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_type">Location Type</Label>
            <select
              id="location_type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.location_type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  location_type: e.target.value as StockLocationFormData['location_type'],
                }))
              }
            >
              {LOCATION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linked_main_category_slug">Linked Menu Department (optional)</Label>
            <select
              id="linked_main_category_slug"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.linked_main_category_slug}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  linked_main_category_slug: e.target.value,
                }))
              }
            >
              <option value="">None</option>
              {mainCategories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Orders from this department will deduct stock from this location by default.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_default: !!checked }))
              }
            />
            <Label htmlFor="is_default" className="cursor-pointer text-sm">
              Default location
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="location_is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: !!checked }))
              }
            />
            <Label htmlFor="location_is_active" className="cursor-pointer text-sm">
              Active
            </Label>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : selectedLocation ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LocationFormDialog;
