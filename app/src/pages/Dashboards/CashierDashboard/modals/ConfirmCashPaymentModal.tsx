import React, { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/application';
import toast from 'react-hot-toast';

interface PaymentMethodOption {
  id: number;
  name: string;
  display_name: string;
  icon?: string;
  is_active: boolean;
}

interface ConfirmCashPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmProcessPaymentOrder: any;
  isBlockingPaymentUi: boolean;
  isProcessing: boolean;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  onConfirm: () => void;
  formatCurrency: (val: any) => string;
}

const ConfirmCashPaymentModal: React.FC<ConfirmCashPaymentModalProps> = ({
  open,
  onOpenChange,
  confirmProcessPaymentOrder,
  isBlockingPaymentUi,
  isProcessing,
  paymentMethod,
  setPaymentMethod,
  onConfirm,
  formatCurrency
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        setLoadingMethods(true);
        const resp = await api.settings.getPaymentMethods();
        const list = (resp as any)?.data?.data?.payment_methods ?? (resp as any)?.data?.payment_methods ?? [];
        const active = (list || []).filter((m: any) => m.is_active);
        setPaymentMethods(active);

        if (active.length > 0 && !active.some((m: any) => m.name === paymentMethod)) {
          setPaymentMethod(active[0].name);
        } else if (active.length === 0) {
          toast.error('No active payment methods. Please contact an administrator.');
        }
      } catch {
        toast.error('Failed to load payment methods');
      } finally {
        setLoadingMethods(false);
      }
    })();
  }, [open, paymentMethod, setPaymentMethod]);

  const selectedMethodLabel =
    paymentMethods.find((method) => method.name === paymentMethod)?.display_name ||
    paymentMethod.replace('_', ' ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogDescription>Select the configured payment method used for this order</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-muted/40 p-4 rounded-xl space-y-1.5">
            <div className="font-extrabold text-sm">Order #{confirmProcessPaymentOrder?.id}</div>
            <p className="text-xs text-muted-foreground font-semibold">
              {confirmProcessPaymentOrder?.type === 'cafe' ? 'Café' : 'Bakery'} Order
              {confirmProcessPaymentOrder?.table_number && ` • Table ${confirmProcessPaymentOrder.table_number}`}
            </p>
            <p className="text-base font-extrabold text-success pt-1">
              {formatCurrency(confirmProcessPaymentOrder?.total_amount || 0)}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">Payment Method</Label>
            {loadingMethods ? (
              <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
            ) : (
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={paymentMethods.length === 0}
              >
                <SelectTrigger className="h-12 rounded-xl border">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.name}>
                      {method.display_name}
                    </SelectItem>
                  ))}
                  {paymentMethods.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                      Payment methods are being loaded or none are configured.
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <p className="text-xs font-bold text-muted-foreground">
            This will be recorded as {selectedMethodLabel} and shown in the payment history.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
          <Button
            variant="outline"
            disabled={isBlockingPaymentUi || isProcessing}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={isBlockingPaymentUi || isProcessing}
            onClick={onConfirm}
          >
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmCashPaymentModal;
