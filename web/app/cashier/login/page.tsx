"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Coffee,
  Loader2,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useCashierAuth } from "@/components/cashier/auth-context";
import { getDeviceEnrollment, isDeviceEnrolled } from "@/lib/cashier/device";
import { cashierServices } from "@/lib/cashier/api";

type Cashier = {
  id: string;
  username?: string;
  full_name?: string;
  name?: string;
};

function getInitials(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CashierLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useCashierAuth();

  const [deviceLabel, setDeviceLabel] = useState<string>("");
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loadingCashiers, setLoadingCashiers] = useState(true);

  const [selected, setSelected] = useState<Cashier | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isDeviceEnrolled()) {
      router.replace("/cashier/enroll");
      return;
    }
    if (isAuthenticated) {
      router.replace("/cashier");
      return;
    }
    const enrollment = getDeviceEnrollment();
    setDeviceLabel(enrollment?.deviceName?.trim() || "");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingCashiers(true);
      try {
        const res: any = await cashierServices.users.getCashiers();
        const list: Cashier[] =
          res?.data?.data?.users ?? res?.data?.users ?? [];
        if (active) {
          setCashiers(
            (Array.isArray(list) ? list : []).filter((u) =>
              String(u.full_name || u.name || u.username || "").trim(),
            ),
          );
        }
      } catch {
        if (active) setCashiers([]);
      } finally {
        if (active) setLoadingCashiers(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedName = useMemo(
    () =>
      selected
        ? selected.full_name || selected.name || selected.username || ""
        : "",
    [selected],
  );

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  }, []);

  const submit = useCallback(async () => {
    if (!selected || submitting || !password) return;
    setSubmitting(true);
    try {
      const user = await login(selectedName.trim(), password);
      toast.success(`Welcome, ${user.full_name || user.username}`);
      router.replace("/cashier");
    } catch (err: any) {
      toast.error(err?.message || "Login failed");
      setPassword("");
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  }, [selected, selectedName, submitting, password, login, router, triggerShake]);

  const goBack = useCallback(() => {
    setSelected(null);
    setPassword("");
    setShowPassword(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/60 to-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <style>{`
        @keyframes cp-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .cp-shake { animation: cp-shake 0.4s ease-in-out; }
      `}</style>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-card/85 backdrop-blur-md border border-border/70 rounded-3xl shadow-2xl shadow-amber-200/30 p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-amber-500 text-primary-foreground shadow-lg shadow-amber-300/40 mb-4">
              <Coffee className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Cashier Sign In
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">
              {selected
                ? "Enter your password to continue"
                : "Choose your name to confirm payments for incoming orders"}
            </p>
            {deviceLabel ? (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-[11px] font-bold text-amber-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                {deviceLabel}
              </span>
            ) : null}
          </div>

          {!selected ? (
            <div>
              {loadingCashiers ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Loading staff…
                  </span>
                </div>
              ) : cashiers.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground font-medium">
                  No cashiers found for this branch. Ask an admin to add a
                  cashier account, then try again.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[20rem] overflow-y-auto pr-1">
                  {cashiers.map((c) => {
                    const label =
                      c.full_name || c.name || c.username || "Unknown";
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelected(c);
                          setPassword("");
                        }}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background/70 p-4 text-center transition hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98]"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-500 text-sm font-black text-primary-foreground shadow-md">
                          {getInitials(label)}
                        </span>
                        <span className="text-xs font-bold text-foreground leading-tight line-clamp-2">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-full bg-background/70 border border-border px-3 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Switch user
              </button>

              <div className="flex flex-col items-center text-center gap-2">
                <div className="relative">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-500 text-xl font-black text-primary-foreground shadow-lg ring-4 ring-amber-200/40">
                    {getInitials(selectedName)}
                  </span>
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-md">
                    <UserCheck className="h-3.5 w-3.5" />
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-foreground tracking-tight">
                  {selectedName}
                </h3>
              </div>

              <div className={shake ? "cp-shake" : ""}>
                <label
                  htmlFor="cashier-password"
                  className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >
                  <Lock className="h-3 w-3 text-primary" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="cashier-password"
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !password}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-8">
          © Syntax Software Solution
        </p>
      </div>
    </div>
  );
}
