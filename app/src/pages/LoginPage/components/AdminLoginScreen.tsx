import React from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ButtonSpinner } from '@/components/common/LoadingSpinner';
import { LoginHeader } from './LoginHeader';

interface AdminLoginScreenProps {
  formData: { username: string; password: string };
  errors: Record<string, string>;
  isLoading: boolean;
  showPassword: boolean;
  disabled?: boolean;
  onUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  formData,
  errors,
  isLoading,
  showPassword,
  disabled = false,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onBack
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <LoginHeader
        title="Staff Sign In"
        subtitle="Enter your operational credentials"
        showBackButton={true}
        onBack={onBack}
      />

      <Card className="border-0 shadow-xl bg-gradient-to-br from-white/95 to-white/80 dark:from-slate-900/95 dark:to-slate-900/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-username" className="text-xs uppercase font-bold text-muted-foreground">
                Username or Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={onUsernameChange}
                  className="pl-10 h-11 text-sm font-semibold rounded-lg border-2 border-muted/30 focus:border-primary/50 transition-colors"
                  placeholder="Username"
                  disabled={isLoading || disabled}
                  autoComplete="username"
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive font-semibold">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-xs uppercase font-bold text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={onPasswordChange}
                  className="pl-10 pr-10 h-11 text-sm font-semibold rounded-lg border-2 border-muted/30 focus:border-primary/50 transition-colors"
                  placeholder="Password"
                  disabled={isLoading || disabled}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={onTogglePassword}
                  disabled={isLoading || disabled}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive font-semibold">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || disabled || !formData.username.trim() || !formData.password}
              className="w-full h-11 text-sm font-bold rounded-lg"
            >
              {isLoading ? (
                <>
                  <ButtonSpinner />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
