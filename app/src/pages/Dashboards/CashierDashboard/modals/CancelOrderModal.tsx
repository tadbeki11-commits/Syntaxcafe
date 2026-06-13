import React, { useState, useEffect } from 'react';
import { compare } from 'bcryptjs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface CancelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmOrder: any;
  isProcessing: boolean;
  onConfirm: () => void;
  formatCurrency: (val: any) => string;
  requireCancelPassword?: boolean;            // true = show password step
  currentAdminHashedPassword?: string | null; // already-loaded hashed password (backend)
  onCancelPasswordChange: (val: string) => void; // callback when cashier types the password
}

type ModalStep = 'confirm' | 'password';

const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  open,
  onOpenChange,
  confirmOrder,
  isProcessing,
  onConfirm,
  formatCurrency,
  requireCancelPassword = false,
  currentAdminHashedPassword = null,
}) => {
  const [step, setStep] = useState<ModalStep>('confirm');
  const [typedPassword, setTypedPassword] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setStep('confirm');
      setTypedPassword('');
    } else {
      setStep('confirm');
      setTypedPassword('');
    }
  }, [open]);

  const handleBackClick = () => {
    if (step === 'password') {
      setStep('confirm');
      setTypedPassword('');
    } else {
      onOpenChange(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!currentAdminHashedPassword) {
      toast.error('Cancel password setting is not configured or cached.');
      return;
    }

    try {
      let ok = false;
      if (currentAdminHashedPassword.startsWith('$2')) {
        ok = await compare(typedPassword, currentAdminHashedPassword);
      } else {
        ok = typedPassword === currentAdminHashedPassword;
      }

      if (!ok) {
        toast.error('Verification password is incorrect.');
        return;
      }

      onConfirm();
    } catch {
      toast.error('Password verification service unavailable.');
    }
  };

  if (step === 'password') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Cancellation Verification Required</DialogTitle>
            <DialogDescription>Enter the override password to cancel this order</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl space-y-1.5">
              <div className="font-extrabold text-sm text-destructive">Order #{confirmOrder?.id}</div>
              <p className="text-xs text-muted-foreground font-semibold">
                {confirmOrder?.type === 'cafe' ? 'Café' : 'Bakery'} Order
                {confirmOrder?.table_number && ` • Table ${confirmOrder.table_number}`}
              </p>
              <p className="text-base font-extrabold text-destructive pt-1">
                {formatCurrency(confirmOrder?.total_amount || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel-password" className="text-xs font-extrabold text-muted-foreground uppercase">
                Override Password
              </Label>
              <Input
                id="cancel-password"
                type="password"
                value={typedPassword}
                onChange={(e) => setTypedPassword(e.target.value)}
                placeholder="Enter override password"
                autoFocus
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button
              variant="outline"
              disabled={isProcessing}
              onClick={handleBackClick}
            >
              ← Back
            </Button>
            <Button
              variant="destructive"
              disabled={isProcessing || !typedPassword}
              onClick={handlePasswordSubmit}
            >
              {isProcessing ? 'Verifying…' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Confirm step ──
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Cancel Table Order</DialogTitle>
          <DialogDescription>This action will discard the current order stream</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl space-y-1.5">
            <div className="font-extrabold text-sm text-destructive">Order #{confirmOrder?.id}</div>
            <p className="text-xs text-muted-foreground font-semibold">
              {confirmOrder?.type === 'cafe' ? 'Café' : 'Bakery'} Order
              {confirmOrder?.table_number && ` • Table ${confirmOrder.table_number}`}
            </p>
            <p className="text-base font-extrabold text-destructive pt-1">
              {formatCurrency(confirmOrder?.total_amount || 0)}
            </p>
          </div>

          <p className="text-xs font-extrabold text-muted-foreground">
            Are you sure you want to cancel this order? {requireCancelPassword && 'An override password will be required to confirm.'}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
          <Button
            variant="outline"
            disabled={isProcessing}
            onClick={() => onOpenChange(false)}
          >
            No, Keep Order
          </Button>
          <Button
            variant="destructive"
            disabled={isProcessing}
            onClick={() => {
              if (requireCancelPassword) {
                setStep('password');
              } else {
                onConfirm();
              }
            }}
          >
            Yes, Cancel Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelOrderModal;
