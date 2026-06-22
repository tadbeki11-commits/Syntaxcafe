import React from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ButtonSpinner } from '@/components/common/LoadingSpinner';
import BranchBadge from '@/components/common/BranchBadge';

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
}) => {
  const inputClass =
    'pl-11 h-12 text-sm font-medium rounded-xl bg-muted/40 border border-input ' +
    'placeholder:text-muted-foreground/60 transition-all ' +
    'focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring';

  return (
    <div className="animate-fade-in">
      <Card className="border border-border/60 shadow-2xl shadow-black/5 bg-card/80 backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Branded header */}
        <div className="flex flex-col items-center gap-4 px-8 pt-9 pb-2">
          <div className="relative">
            <span className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
            <img
              src="/assets/logo.png?v=8"
              alt="Logo"
              className="relative h-20 w-20 object-contain rounded-2xl bg-gradient-to-br from-white to-slate-50 p-2.5 shadow-md ring-1 ring-black/5"
            />
          </div>

          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue to your dashboard
            </p>
          </div>

          <BranchBadge />
        </div>

        <CardContent className="px-8 pb-8 pt-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="admin-username"
                className="text-xs font-semibold text-muted-foreground"
              >
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={onUsernameChange}
                  className={inputClass}
                  placeholder="Enter your username"
                  disabled={isLoading || disabled}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive font-medium">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="admin-password"
                className="text-xs font-semibold text-muted-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={onPasswordChange}
                  className={`${inputClass} pr-11`}
                  placeholder="Enter your password"
                  disabled={isLoading || disabled}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  onClick={onTogglePassword}
                  disabled={isLoading || disabled}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive font-medium">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || disabled || !formData.username.trim() || !formData.password}
              className="group w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <ButtonSpinner />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
