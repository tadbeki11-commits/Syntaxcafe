import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RoleFormData } from '../types';

interface RoleFormDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectedRole: any;
  formData: RoleFormData;
  setFormData: React.Dispatch<React.SetStateAction<RoleFormData>>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const RoleFormDialog: React.FC<RoleFormDialogProps> = ({
  dialogOpen,
  setDialogOpen,
  selectedRole,
  formData,
  setFormData,
  saving,
  onSubmit,
}) => {
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={e => {
                const val = e.target.value;
                setFormData(p => ({
                  ...p,
                  display_name: val,
                  name: p.name || val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                }));
              }}
              placeholder="e.g. Restaurant Manager"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">System Key</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') }))}
              placeholder="e.g. restaurant_manager"
              required
            />
            <p className="text-[10px] text-muted-foreground font-medium">Lowercase with underscores only. Used internally to check permissions.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="What does this role do?"
              className="resize-none h-16"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={checked => setFormData(p => ({ ...p, is_active: !!checked }))}
            />
            <Label htmlFor="is_active" className="cursor-pointer text-sm">Active</Label>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : selectedRole ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
