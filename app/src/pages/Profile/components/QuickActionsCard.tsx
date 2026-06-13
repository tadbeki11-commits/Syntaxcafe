import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickActionsCardProps {
  isOnline: boolean;
  setShowChangePassword: (show: boolean) => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ isOnline, setShowChangePassword }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        <Button
          className="w-full justify-start text-xs font-bold"
          variant="outline"
          onClick={() => setShowChangePassword(true)}
          disabled={!isOnline}
        >
          Change Password {!isOnline && ' (Unavailable Offline)'}
        </Button>
        <Button className="w-full justify-start text-xs font-bold" variant="outline">
          Download Data
        </Button>
        <Button className="w-full justify-start text-xs font-bold" variant="outline">
          Privacy Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickActionsCard;
