import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginHeader } from './LoginHeader';
import { UserCard } from './UserCard';

interface UserSelectionScreenProps {
  employees: any[];
  isLoading: boolean;
  isOffline?: boolean;
  onSelectUser: (user: any) => void;
  onAdminLogin: () => void;
}

export const UserSelectionScreen: React.FC<UserSelectionScreenProps> = ({
  employees,
  isLoading,
  isOffline = false,
  onSelectUser,
  onAdminLogin
}) => {
  const waiters = employees.filter(e => e.role === 'cafe_waiter' || e.role === 'waiter');

  return (
    <div className="space-y-6 animate-fade-in">
      <LoginHeader
        title="Welcome Back"
        subtitle="Select your profile to check in"
        showLogo={true}
      />

      <Card className="border-0 shadow-xl bg-gradient-to-br from-white/95 to-white/80 dark:from-slate-900/95 dark:to-slate-900/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-base">Quick Select</CardTitle>
          <CardDescription className="text-xs font-semibold">Tap your profile circle to continue</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {waiters.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <p className="font-semibold">No staff available</p>
                <p className="text-xs mt-1">Please contact administrator</p>
              </div>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto pr-2">
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                {waiters.map((employee) => (
                  <UserCard
                    key={employee.id}
                    user={employee}
                    onSelect={onSelectUser}
                    isLoading={isLoading || isOffline}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold gap-2 hover:bg-muted/50 text-foreground"
              onClick={onAdminLogin}
              disabled={isLoading || isOffline}
            >
              <Settings className="w-4 h-4" />
              Staff Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
