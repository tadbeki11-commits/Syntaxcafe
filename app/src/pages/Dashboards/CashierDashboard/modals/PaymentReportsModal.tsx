import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart2, DollarSign, Square } from 'lucide-react';

interface PaymentReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayStats: {
    paymentsProcessed: number;
    totalRevenue: number;
    qrPayments: number;
    cashPayments: number;
  };
  formatCurrency: (val: any) => string;
}

const PaymentReportsModal: React.FC<PaymentReportsModalProps> = ({
  open,
  onOpenChange,
  todayStats,
  formatCurrency
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Payment Reports</DialogTitle>
          <DialogDescription>Review daily transaction summary and drawer closure logs</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-info/10 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-info">Total Payments</p>
                <p className="text-xl font-extrabold text-info dark:text-blue-200 mt-0.5">
                  {todayStats.paymentsProcessed}
                </p>
              </div>
              <BarChart2 className="w-7 h-7 text-info" />
            </div>

            <div className="bg-success/10 border border-green-500/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-success">Total Revenue</p>
                <p className="text-xl font-extrabold text-success dark:text-green-200 mt-0.5">
                  {formatCurrency(todayStats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-7 h-7 text-success" />
            </div>

            <div className="bg-primary/10 border border-purple-500/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-primary">QR Payments</p>
                <p className="text-xl font-extrabold text-purple-900 dark:text-purple-200 mt-0.5">
                  {todayStats.qrPayments}
                </p>
              </div>
              <Square className="w-7 h-7 text-primary" />
            </div>
          </div>

          <div className="bg-muted/40 border p-4 rounded-xl space-y-3">
            <h4 className="font-extrabold text-xs text-foreground uppercase">Payment Methods Breakdowns</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center border-b pb-1.5">
                <span className="text-muted-foreground font-semibold">Cash Payments</span>
                <span className="font-extrabold text-foreground">{todayStats.cashPayments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">QR Code Payments</span>
                <span className="font-extrabold text-foreground">{todayStats.qrPayments}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Close Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentReportsModal;
