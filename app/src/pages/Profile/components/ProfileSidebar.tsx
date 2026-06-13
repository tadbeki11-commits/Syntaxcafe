import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { getRoleVariant } from '../utils';

interface ProfileSidebarProps {
  user: any;
  getRoleDisplayName: () => string;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ user, getRoleDisplayName }) => {
  return (
    <Card className="text-center hover:shadow-md transition-shadow">
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-center">
          <Avatar className="w-24 h-24 text-3xl font-bold bg-primary/10 border-2 border-primary/20">
            <AvatarFallback className="text-primary bg-primary/10">
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground truncate">{user?.full_name}</h2>
          <p className="text-xs text-muted-foreground font-semibold">@{user?.username}</p>
        </div>
        
        <div className="flex justify-center">
          <Badge 
            variant={getRoleVariant(user?.role)} 
            className="uppercase tracking-wider py-1 px-3 flex items-center gap-1.5 font-bold text-[10px]"
          >
            <Shield className="w-3.5 h-3.5" />
            {getRoleDisplayName()}
          </Badge>
        </div>

        <div className="text-[10px] text-muted-foreground font-semibold space-y-1 border-t pt-4 text-left">
          <div className="flex justify-between">
            <span>Account Status</span>
            <span className={`font-bold ${user?.is_active ? 'text-success' : 'text-destructive'}`}>
              {user?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Member Since</span>
            <span className="font-mono">{new Date(user?.created_at || '').toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSidebar;
