import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Role } from '../types';

interface RoleStatsProps {
  roles: Role[];
}

export const RoleStats: React.FC<RoleStatsProps> = ({ roles }) => {
  const activeCount = roles.filter(r => r.is_active).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Default + Custom Roles</div>
          <div className="text-2xl font-extrabold">{roles.length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Active</div>
          <div className="text-2xl font-extrabold text-success">{activeCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Custom</div>
          <div className="text-2xl font-extrabold">
            {roles.filter(r => r.name !== 'admin' && r.name !== 'cashier').length}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
