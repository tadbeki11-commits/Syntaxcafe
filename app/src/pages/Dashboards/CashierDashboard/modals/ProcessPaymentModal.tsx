import { uuidToDisplayId } from "@/lib/utils";
import React, { useState, useEffect } from 'react';
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

interface ProcessPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrder: any;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  onProcessPayment: () => void;
  formatCurrency: (val: any) => string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'dollar-sign': (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  'credit-card': (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
  'square': (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>,
  'smartphone': (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" /></svg>,
};

const ProcessPaymentModal: React.FC<ProcessPaymentModalProps> = ({
  open,
  onOpenChange,
  selectedOrder,
  paymentMethod,
  setPaymentMethod,
  onProcessPayment,
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

        // If current selection is no longer active, pick the first active method
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
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>Choose a payment method to close the active table stream</DialogDescription>
        </DialogHeader>

        {selectedOrder && (
          <div className="space-y-4 pt-2">
            <div className="bg-muted/40 p-4 rounded-xl space-y-1.5">
              <div className="font-extrabold text-sm">Order #{uuidToDisplayId(selectedOrder.id)}</div>
              <p className="text-xs text-muted-foreground font-semibold">
                {selectedOrder.type === 'cafe' ? 'Café' : 'Bakery'} Order
                {selectedOrder.table_number && ` • Table ${selectedOrder.table_number}`}
              </p>
              <p className="text-base font-extrabold text-success pt-1">
                {formatCurrency(selectedOrder.total_amount)}
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
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.display_name}
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
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onProcessPayment}>
            {paymentMethod === 'cash' ? 'Process Cash Payment' : 'Process Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessPaymentModal;
