import React, { useEffect, useState } from 'react';
import { User, Lock, ArrowLeft, Delete, RotateCcw, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ButtonSpinner } from '@/components/common/LoadingSpinner';
import { getUserInitials } from '../utils';

interface PinEntryScreenProps {
  selectedUser: any;
  formData: { username: string; pin: string };
  errors: Record<string, string>;
  isLoading: boolean;
  disabled?: boolean;
  onUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPinInput: (digit: string) => void;
  onPinClear: () => void;
  onPinBackspace: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  usernameRef: React.RefObject<HTMLInputElement | null>;
  pinRef?: React.RefObject<HTMLInputElement | null>;
}

export const PinEntryScreen: React.FC<PinEntryScreenProps> = ({
  selectedUser,
  formData,
  errors,
  isLoading,
  disabled = false,
  onUsernameChange,
  onPinInput,
  onPinClear,
  onPinBackspace,
  onSubmit,
  onBack,
  usernameRef,
  pinRef
}) => {
  const [triggerShake, setTriggerShake] = useState(false);

  // Trigger shake animation when pin error changes
  useEffect(() => {
    if (errors.pin) {
      setTriggerShake(true);
      const timer = setTimeout(() => setTriggerShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [errors.pin]);

  // Handle number pad mappings for sub-labels (Phone keypad style)
  const keyLabels: Record<string, string> = {
    '1': 'o _ o',
    '2': 'A B C',
    '3': 'D E F',
    '4': 'G H I',
    '5': 'J K L',
    '6': 'M N O',
    '7': 'P Q R S',
    '8': 'T U V',
    '9': 'W X Y Z',
    '0': '🔑'
  };

  // Get customized colors based on user role
  const getRoleTheme = (role?: string) => {
    const r = String(role || '').toLowerCase();
    if (r.includes('admin')) {
      return {
        bg: 'from-amber-500 to-orange-600',
        ring: 'ring-amber-500/30',
        text: 'text-warning dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/50',
        name: 'Admin'
      };
    }
    if (r.includes('cashier')) {
      return {
        bg: 'from-teal-500 to-emerald-600',
        ring: 'ring-teal-500/30',
        text: 'text-teal-600 dark:text-teal-400',
        badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200/50',
        name: 'Cashier'
      };
    }
    if (r.includes('kitchen')) {
      return {
        bg: 'from-purple-500 to-indigo-600',
        ring: 'ring-purple-500/30',
        text: 'text-primary dark:text-purple-400',
        badge: 'bg-primary/15 text-primary dark:bg-purple-950/50 dark:text-purple-300 border-primary/30/50',
        name: 'Kitchen Staff'
      };
    }
    // Waiter
    return {
      bg: 'from-blue-500 to-indigo-600',
      ring: 'ring-blue-500/30',
      text: 'text-info dark:text-blue-400',
      badge: 'bg-info/15 text-info dark:bg-blue-950/50 dark:text-blue-300 border-info/30/50',
      name: 'Café Waiter'
    };
  };

  const theme = getRoleTheme(selectedUser?.role);
  const initials = getUserInitials(selectedUser?.full_name || '');

  return (
    <div className="space-y-6">
      {/* Dynamic Keyframes Injection */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-8px); }
          30%, 60%, 90% { transform: translateX(8px); }
        }
        @keyframes pop {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes breathingGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.15); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        .animate-pop {
          animation: pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .glow-active {
          animation: breathingGlow 2s infinite ease-in-out;
        }
      `}</style>

      {/* Elegant glass back button */}
      <div className="flex justify-between items-center px-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="text-xs font-bold gap-2 bg-background/70 hover:bg-background dark:bg-slate-900/70 dark:hover:bg-slate-900 border-muted/20 text-muted-foreground hover:text-foreground shadow-sm rounded-full transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Go Back
        </Button>
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 bg-muted/30 px-3 py-1 rounded-full border border-muted/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          Terminal Session
        </span>
      </div>

      {/* Redesigned Premium Glass Card */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-white/95 to-slate-50/90 dark:from-slate-900/95 dark:to-slate-950/90 backdrop-blur-md relative overflow-hidden rounded-2xl">
        {/* Visual decoration */}
        <div className="absolute -right-16 -top-16 w-36 h-36 bg-info/10 dark:bg-info/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        <CardContent className="pt-8 px-6 pb-6">
          <form onSubmit={onSubmit} className="space-y-6">

            {/* 1. High-fidelity User Identity Section */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className={`relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr ${theme.bg} shadow-lg ring-4 ${theme.ring} hover:scale-105 transition-all duration-300`}>
                <div className="w-full h-full bg-slate-900/90 dark:bg-slate-950/90 rounded-full flex items-center justify-center text-white border-2 border-white/10 relative">
                  <span className="text-2xl font-black tracking-wider uppercase font-sans">
                    {initials}
                  </span>
                  <div className={`absolute -bottom-1.5 -right-1 p-1.5 rounded-full bg-gradient-to-br ${theme.bg} text-white shadow-md border border-white/20`}>
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${theme.badge}`}>
                  {theme.name}
                </span>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                  {selectedUser?.full_name || selectedUser?.username}
                </h3>
              </div>
            </div>

            {/* 2. Username Hidden Input (Keep autofill compatible & robust) */}
            <div className="hidden">
              <Input
                id="username"
                type="text"
                ref={usernameRef}
                value={formData.username}
                onChange={onUsernameChange}
                disabled={isLoading || disabled}
                autoComplete="username"
              />
            </div>

            {/* 3. Redesigned PIN Code Indicators with shake animations */}
            <div className={`space-y-3 ${triggerShake ? 'animate-shake' : ''}`}>
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-info" />
                  Security PIN Code
                </Label>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {formData.pin.length}/4 digits
                </span>
              </div>

              <div className="flex justify-center gap-4 py-2">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = formData.pin.length > index;
                  const isActive = formData.pin.length === index;

                  return (
                    <div
                      key={index}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${isFilled
                          ? `border-primary bg-primary/5 text-primary shadow-inner`
                          : isActive
                            ? 'border-blue-500 bg-info/5 glow-active'
                            : 'border-muted/30 bg-muted/5'
                        }`}
                    >
                      {isFilled ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-primary to-blue-600 animate-pop shadow-md shadow-primary/30" />
                      ) : (
                        <span className="text-xs text-muted-foreground/30 font-bold"></span>
                      )}
                    </div>
                  );
                })}
              </div>

              {errors.pin && (
                <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold text-center mt-1 bg-rose-500/10 py-1.5 px-3 rounded-lg border border-rose-500/10">
                  {errors.pin}
                </p>
              )}
            </div>

            {/* 4. Beautiful Phone-style Grid Keypad */}
            <div className="pt-2">
              <div className="grid grid-cols-3 gap-3.5 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onPinInput(num.toString())}
                    disabled={isLoading || disabled}
                    className="h-16 flex flex-col justify-center items-center bg-background dark:bg-slate-900 border-2 border-slate-200/50 dark:border-slate-800/80 hover:border-blue-500/60 dark:hover:border-blue-500/60 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-95 active:bg-info/10 transition-all duration-150 group"
                  >
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100 group-hover:text-info transition-colors">
                      {num}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground/60 tracking-wider group-hover:text-blue-400/80 transition-colors uppercase">
                      {keyLabels[num.toString()]}
                    </span>
                  </button>
                ))}

                {/* Clear Button */}
                <button
                  type="button"
                  onClick={onPinClear}
                  disabled={isLoading || disabled}
                  className="h-16 flex flex-col justify-center items-center bg-rose-500/5 dark:bg-rose-500/10 border-2 border-rose-500/20 hover:border-rose-500/50 rounded-2xl shadow-sm hover:shadow-md active:scale-95 hover:bg-rose-500/10 transition-all duration-150 group"
                >
                  <RotateCcw className="w-5 h-5 text-rose-500 group-hover:rotate-45 transition-transform duration-300" />
                  <span className="text-[9px] font-black text-rose-500/80 tracking-widest mt-1 uppercase">
                    Clear
                  </span>
                </button>

                {/* Number 0 */}
                <button
                  type="button"
                  onClick={() => onPinInput('0')}
                  disabled={isLoading || disabled}
                  className="h-16 flex flex-col justify-center items-center bg-background dark:bg-slate-900 border-2 border-slate-200/50 dark:border-slate-800/80 hover:border-blue-500/60 dark:hover:border-blue-500/60 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-95 active:bg-info/10 transition-all duration-150 group"
                >
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-100 group-hover:text-info transition-colors">
                    0
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground/60 tracking-wider group-hover:text-blue-400/80 transition-colors uppercase">
                    {keyLabels['0']}
                  </span>
                </button>

                {/* Backspace Button */}
                <button
                  type="button"
                  onClick={onPinBackspace}
                  disabled={isLoading || disabled}
                  className="h-16 flex flex-col justify-center items-center bg-warning/5 dark:bg-warning/10 border-2 border-warning/20 hover:border-warning/50 rounded-2xl shadow-sm hover:shadow-md active:scale-95 hover:bg-warning/10 transition-all duration-150 group"
                >
                  <Delete className="w-5 h-5 text-warning group-hover:-translate-x-0.5 transition-transform duration-200" />
                  <span className="text-[9px] font-black text-warning/80 tracking-widest mt-1 uppercase">
                    Delete
                  </span>
                </button>
              </div>
            </div>

            {/* 5. Custom Call-To-Action Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading || disabled || !formData.username || formData.pin.length !== 4}
                className="w-full h-12 text-sm font-black rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all bg-gradient-to-r bg-primary hover:bg-primary/90 text-primary-foreground tracking-widest uppercase"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <ButtonSpinner />
                    <span>Authorizing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Sign In</span>
                  </div>
                )}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};
