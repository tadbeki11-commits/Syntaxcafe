"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coffee, Loader2, Lock, User, ShieldCheck } from "lucide-react";
import { useWaiterAuth } from "@/components/waiter/auth-context";
import { getDeviceEnrollment, isDeviceEnrolled } from "@/lib/waiter/device";

export default function WaiterLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useWaiterAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    // A device must be enrolled before anyone can sign in.
    if (!isDeviceEnrolled()) {
      router.replace("/waiter/enroll");
      return;
    }
    if (isAuthenticated) {
      router.replace("/waiter");
      return;
    }
    const enrollment = getDeviceEnrollment();
    setDeviceLabel(enrollment?.deviceName?.trim() || "");
  }, [authLoading, isAuthenticated, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      toast.success(`Welcome, ${user.full_name || user.username}`);
      router.replace("/waiter");
    } catch (err: any) {
      toast.error(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/60 to-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-card/85 backdrop-blur-md border border-border/70 rounded-3xl shadow-2xl shadow-amber-200/30 p-8">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-amber-500 text-primary-foreground shadow-lg shadow-amber-300/40 mb-4">
              <Coffee className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Waiter Sign In
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">
              Sign in to take and manage table orders
            </p>
            {deviceLabel ? (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-[11px] font-bold text-amber-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                {deviceLabel}
              </span>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. abebe"
                  autoComplete="username"
                  required
                  disabled={submitting}
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-md shadow-amber-300/30 transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
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

          <button
            type="button"
            onClick={() => router.push("/waiter/enroll")}
            className="mt-5 w-full text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-primary transition-colors"
          >
            Re-enroll this device
          </button>
        </div>

        <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-8">
          © Syntax Software Solution
        </p>
      </div>
    </div>
  );
}
