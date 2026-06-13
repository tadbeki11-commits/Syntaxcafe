import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrgFormState } from '../types';

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: any;
  form: OrgFormState;
  setForm: (form: OrgFormState) => void;
  saving: boolean;
  onSubmit: () => void;
}

export const OrganizationDialog = ({
  open,
  onOpenChange,
  selected,
  form,
  setForm,
  saving,
  onSubmit,
}: OrganizationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{selected ? 'Edit Organization' : 'Add Organization'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Name *</Label>
            <Input id="org-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Acme Corporation" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-contact">Contact name</Label>
              <Input id="org-contact" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-phone">Phone</Label>
              <Input id="org-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="org-address">Address</Label>
            <Input id="org-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving ? 'Saving...' : selected ? 'Save changes' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
