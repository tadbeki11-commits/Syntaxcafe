import React from 'react';
import { Button } from '@/components/ui/button';
import { getRoleColors, getUserInitials } from '../utils';

interface UserCardProps {
  user: any;
  onSelect: (user: any) => void;
  isLoading: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onSelect, isLoading }) => {
  return (
    <div className="flex flex-col items-center gap-2 group">
      <Button
        onClick={() => onSelect(user)}
        disabled={isLoading}
        className={`w-20 h-20 rounded-full font-extrabold text-base transition-all ${getRoleColors(user.role)} shadow-xl hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {getUserInitials(user.full_name || user.name || user.username || '')}
      </Button>
      <span className="text-xs font-bold text-foreground truncate w-full text-center group-hover:text-primary transition-colors max-w-[80px]">
        {user.full_name || user.name || user.username}
      </span>
    </div>
  );
};
