import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { MANAGEMENT_CENTER_ITEMS } from '../constants';

export const ManagementCenter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <span>Management Center</span>
        </CardTitle>
        <CardDescription>
          Quick administrative shortcuts and floor setup configurations
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {MANAGEMENT_CENTER_ITEMS.map((item, idx) => (
          <Button
            key={idx}
            variant="outline"
            onClick={() => navigate(item.path)}
            className="h-auto py-3.5 px-4 flex flex-col items-start gap-1 justify-center rounded-2xl hover:bg-muted/50 text-left border"
          >
            <span className="font-extrabold text-xs text-foreground block truncate">
              {item.label}
            </span>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block truncate">
              {item.desc}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
