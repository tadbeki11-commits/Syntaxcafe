import React from 'react';
import { DollarSign, Square, TrendingUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AdminUtilitiesBarProps {
  onProcessPayments: () => void;
  onViewReports: () => void;
  onProfile: () => void;
}

export const AdminUtilitiesBar: React.FC<AdminUtilitiesBarProps> = ({
  onProcessPayments,
  onViewReports,
  onProfile
}) => {
  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Drawer Administrative Utilities</CardTitle>
        <CardDescription>Shortcut workflows for active cashier operators</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="h-16 flex flex-col items-center justify-center gap-1 rounded-2xl border hover:bg-muted/50"
          onClick={onProcessPayments}
        >
          <DollarSign className="w-5 h-5 text-primary" />
          <span className="font-extrabold text-xs">Process Payments</span>
        </Button>


        <Button
          variant="outline"
          className="h-16 flex flex-col items-center justify-center gap-1 rounded-2xl border hover:bg-muted/50"
          onClick={onViewReports}
        >
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-extrabold text-xs">View Reports</span>
        </Button>

        <Button
          variant="outline"
          className="h-16 flex flex-col items-center justify-center gap-1 rounded-2xl border hover:bg-muted/50"
          onClick={onProfile}
        >
          <User className="w-5 h-5 text-primary" />
          <span className="font-extrabold text-xs">My Profile</span>
        </Button>
      </CardContent>
    </Card>
  );
};
