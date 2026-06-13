import React from 'react';
import { Edit3, Trash2, ToggleLeft, ToggleRight, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/common/EmptyState';
import { UserItem } from '../types';
import { ROLE_DISPLAY, ROLE_BADGE_VARIANT, ROLE_AVATAR_BG } from '../constants';

interface UsersTableProps {
  loading: boolean;
  filteredUsers: UserItem[];
  toggleStatus: (id: number) => void;
  openEdit: (user: UserItem) => void;
  deleteUser: (id: number) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  loading,
  filteredUsers,
  toggleStatus,
  openEdit,
  deleteUser
}) => {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={`text-xs font-bold ${ROLE_AVATAR_BG[user.role] || 'bg-muted text-muted-foreground'}`}>
                          {(user.full_name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE_VARIANT[user.role] || 'secondary'}>
                      {ROLE_DISPLAY[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'success' : 'destructive'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(user.id)} title={user.is_active ? 'Deactivate' : 'Activate'}>
                        {user.is_active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteUser(user.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<Filter />}
                      title="No users found"
                      description="Try adjusting your search or filter criteria"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// Internal local button import helper to keep UI references intact
import { Button } from '@/components/ui/button';

export default UsersTable;
