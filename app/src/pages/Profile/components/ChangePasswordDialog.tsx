import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PasswordFormData } from '../types';

interface ChangePasswordDialogProps {
  showChangePassword: boolean;
  setShowChangePassword: (show: boolean) => void;
  isLoading: boolean;
  isWaiter: boolean;
  passwordForm: PasswordFormData;
  passwordErrors: any;
  handlePasswordFieldChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  submitPasswordChange: (e: React.FormEvent) => void;
  handleClosePasswordDialog: () => void;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  showChangePassword,
  setShowChangePassword,
  isLoading,
  isWaiter,
  passwordForm,
  passwordErrors,
  handlePasswordFieldChange,
  submitPasswordChange,
  handleClosePasswordDialog
}) => {
  return (
    <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isWaiter ? 'Change PIN' : 'Change Password'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submitPasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label>
              {isWaiter ? 'Current PIN' : 'Current Password'}
            </Label>
            <Input
              type={isWaiter ? 'tel' : 'password'}
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange}
              disabled={isLoading}
              autoComplete="current-password"
              maxLength={isWaiter ? 4 : undefined}
              style={isWaiter ? ({ WebkitTextSecurity: 'disc' } as any) : undefined}
              className={passwordErrors.currentPassword ? 'border-destructive' : ''}
            />
            {passwordErrors.currentPassword && (
              <p className="text-xs text-destructive font-semibold">{passwordErrors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              {isWaiter ? 'New PIN' : 'New Password'}
            </Label>
            <Input
              type={isWaiter ? 'tel' : 'password'}
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordFieldChange}
              disabled={isLoading}
              autoComplete="new-password"
              maxLength={isWaiter ? 4 : undefined}
              style={isWaiter ? ({ WebkitTextSecurity: 'disc' } as any) : undefined}
              className={passwordErrors.newPassword ? 'border-destructive' : ''}
            />
            {passwordErrors.newPassword && (
              <p className="text-xs text-destructive font-semibold">{passwordErrors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Confirm {isWaiter ? 'PIN' : 'Password'}
            </Label>
            <Input
              type={isWaiter ? 'tel' : 'password'}
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFieldChange}
              disabled={isLoading}
              autoComplete="new-password"
              maxLength={isWaiter ? 4 : undefined}
              style={isWaiter ? ({ WebkitTextSecurity: 'disc' } as any) : undefined}
              className={passwordErrors.confirmPassword ? 'border-destructive' : ''}
            />
            {passwordErrors.confirmPassword && (
              <p className="text-xs text-destructive font-semibold">{passwordErrors.confirmPassword}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClosePasswordDialog}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
