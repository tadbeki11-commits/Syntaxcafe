import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserItem, UserFormData } from '../types';

interface RoleOption {
  id: number;
  name: string;
  display_name: string;
  is_active: boolean;
}

interface UserFormDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectedUser: UserItem | null;
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  authMode: 'password' | 'pin';
  setAuthMode: (mode: 'password' | 'pin') => void;
  handleSubmit: (e: React.FormEvent) => void;
  roles?: RoleOption[];          // dynamically loaded from /settings/roles
}

export const UserFormDialog: React.FC<UserFormDialogProps> = ({
  dialogOpen,
  setDialogOpen,
  selectedUser,
  formData,
  setFormData,
  authMode,
  setAuthMode,
  handleSubmit,
  roles = []
}) => {
  const roleList = roles.length > 0 ? roles : [
    { id: 1, name: 'admin', display_name: 'Administrator', is_active: true },
    { id: 3, name: 'cashier', display_name: 'Cashier', is_active: true }
  ];

  const activeRoles = roleList.filter(r => r.is_active || r.name === formData.role);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} required />
          </div>

          {/* Auth Mode Tabs */}
          <div className="space-y-2">
            <Label>Authentication Method</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={authMode === 'password' ? 'default' : 'outline'}
                onClick={() => setAuthMode('password')}
                className="flex-1"
              >
                Password
              </Button>
              <Button
                type="button"
                size="sm"
                variant={authMode === 'pin' ? 'default' : 'outline'}
                onClick={() => setAuthMode('pin')}
                className="flex-1"
              >
                4-Digit PIN
              </Button>
            </div>
          </div>

          {authMode === 'password' ? (
            <div className="space-y-2">
              <Label htmlFor="password">Password {selectedUser && '(leave blank to keep)'}</Label>
              <Input id="password" type="password" value={formData.password || ''} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} required={!selectedUser} placeholder="Min 6 chars" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="pin">4-Digit PIN {selectedUser && '(leave blank to keep)'}</Label>
              <Input id="pin" type="tel" value={formData.pin || ''} onChange={e => setFormData(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))} required={!selectedUser} placeholder="Enter 4-digit PIN" maxLength={4} inputMode="numeric" />
            </div>
          )}

          {formData.role === 'admin' && authMode === 'password' && (
            <div className="space-y-2">
              <Label htmlFor="cancel_password">Cancel Password {selectedUser && '(leave blank to keep)'}</Label>
              <Input
                id="cancel_password"
                type="password"
                value={formData.cancel_password || ''}
                onChange={e => setFormData(p => ({ ...p, cancel_password: e.target.value }))}
                placeholder="Admin override password used for order cancellations"
                autoComplete="new-password"
              />
              <p className="text-[10px] text-muted-foreground font-medium">
                This password is cached locally for cashier cancellation checks.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={formData.role}
              onValueChange={v =>
                setFormData(p => ({
                  ...p,
                  role: v,
                  cancel_password: v === 'admin' ? (p.cancel_password || '') : '',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeRoles.map(role => (
                  <SelectItem key={role.name} value={role.name}>
                    {role.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} className="rounded border-input" />
            <Label htmlFor="is_active" className="cursor-pointer">Active User</Label>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit">{selectedUser ? 'Update User' : 'Create User'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
