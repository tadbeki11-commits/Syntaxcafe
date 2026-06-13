import React from 'react';
import { Edit3, Trash2, DollarSign, Wifi, Smartphone, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentMethod } from '../types';

const ICON_MAP: Record<string, React.ElementType> = {
  'dollar-sign': DollarSign,
  'credit-card': CreditCard,
  'square': Wifi,
  'smartphone': Smartphone,
};

interface PaymentMethodsTableProps {
  loading: boolean;
  methods: PaymentMethod[];
  onEdit: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
}

export const PaymentMethodsTable: React.FC<PaymentMethodsTableProps> = ({
  loading,
  methods,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Configured Methods</CardTitle>
        <CardDescription>Payment options available at the cashier checkout</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-2">
        {methods.map(method => {
          const Icon = ICON_MAP[method.icon || ''] ?? DollarSign;
          return (
            <div
              key={method.id}
              className="flex items-center gap-4 p-4 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{method.display_name}</div>
                <div className="text-[10px] text-muted-foreground font-medium">Key: {method.name}</div>
                {method.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{method.description}</div>
                )}
              </div>

              <Badge
                variant={method.is_active ? 'default' : 'outline'}
                className={
                  method.is_active
                    ? 'bg-success/15 text-success border-green-500/30 font-bold text-[10px]'
                    : 'bg-muted/30 text-muted-foreground font-bold text-[10px]'
                }
              >
                {method.is_active ? 'Active' : 'Disabled'}
              </Badge>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => onEdit(method)}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDelete(method)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {methods.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
            No payment methods configured. Click "Add Method" to create one.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
