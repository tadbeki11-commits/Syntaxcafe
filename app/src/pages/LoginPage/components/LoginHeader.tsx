import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BranchBadge from '@/components/common/BranchBadge';

interface LoginHeaderProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  userInitials?: string;
  userRole?: string;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({
  title,
  subtitle,
  showLogo = false,
  showBackButton = false,
  onBack,
  userInitials,
  userRole
}) => {
  return (
    <div className="text-center space-y-4">
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs font-bold gap-2 hover:bg-transparent text-muted-foreground hover:text-foreground mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      )}

      {showLogo && (
        <div className="flex justify-center pt-2">
          <img
            src="/assets/logo.png?v=8"
            alt="Logo"
            className="w-40 h-40 object-contain bg-gradient-to-br from-white to-gray-50 rounded-3xl p-3 shadow-lg"
          />
        </div>
      )}

      {userInitials && userRole && (
        <div className="flex justify-center pt-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 text-white font-bold text-xl flex items-center justify-center shadow-lg">
            {userInitials}
          </div>
        </div>
      )}

      <BranchBadge />

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-foreground uppercase">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground font-semibold">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
