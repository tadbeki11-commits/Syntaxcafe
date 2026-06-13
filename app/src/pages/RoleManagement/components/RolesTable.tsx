import React from 'react';
import { Edit3, Trash2, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Role } from '../types';

const DEFAULT_ROLES = ['admin', 'cafe_waiter', 'cashier', 'kitchen_staff'];

interface RolesTableProps {
  loading: boolean;
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export const RolesTable: React.FC<RolesTableProps> = ({
  loading,
  roles,
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
        <CardTitle className="text-base">Defined Roles</CardTitle>
        <CardDescription>Roles available for assignment during user account creation</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-2">
        {roles.map(role => {
          const isDefault = DEFAULT_ROLES.includes(role.name);
          return (
            <div
              key={role.id}
              className="flex items-center gap-4 p-4 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                {isDefault ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-2">
                  {role.display_name}
                  {isDefault && (
                    <Badge variant="outline" className="h-4 text-[8px] font-bold px-1 border-none text-muted-foreground">default</Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">Key: {role.name}</div>
                {role.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{role.description}</div>
                )}
              </div>

              <Badge
                variant={role.is_active ? 'default' : 'outline'}
                className={
                  role.is_active
                    ? 'bg-success/15 text-success border-green-500/30 font-bold text-[10px]'
                    : 'bg-muted/30 text-muted-foreground font-bold text-[10px]'
                }
              >
                {role.is_active ? 'Active' : 'Disabled'}
              </Badge>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => onEdit(role)}
                  disabled={isDefault}
                  title={isDefault ? 'Default roles cannot be edited' : 'Edit role'}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDelete(role)}
                  disabled={isDefault}
                  title={isDefault ? 'Default roles cannot be disabled' : 'Disable role'}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {roles.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground font-bold border border-dashed rounded-xl bg-muted/20">
            No roles configured. Click "Add Role" to create one.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
