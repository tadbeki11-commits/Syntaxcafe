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
  Delete,
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useWaiterAuth } from "@/components/waiter/auth-context";
import { getDeviceEnrollment, isDeviceEnrolled } from "@/lib/waiter/device";
import { waiterServices } from "@/lib/waiter/api";

type Waiter = {
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

const PIN_LENGTH = 4;

export default function WaiterLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useWaiterAuth();

  const [deviceLabel, setDeviceLabel] = useState<string>("");
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loadingWaiters, setLoadingWaiters] = useState(true);

  const [selected, setSelected] = useState<Waiter | null>(null);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  // Device must be enrolled before anyone can sign in.
  useEffect(() => {
    if (authLoading) return;
    if (!isDeviceEnrolled()) {
      router.replace("/waiter/enroll");
      return;
    }
    if (isAuthenticated) {
      router.replace("/waiter/create-order");
      return;
    }
    const enrollment = getDeviceEnrollment();
    setDeviceLabel(enrollment?.deviceName?.trim() || "");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingWaiters(true);
      try {
        const res: any = await waiterServices.users.getWaiters();
        const list: Waiter[] =
          res?.data?.data?.users ?? res?.data?.users ?? [];
        if (active) {
          setWaiters(
            (Array.isArray(list) ? list : []).filter((u) =>
              String(u.full_name || u.name || u.username || "").trim(),
            ),
          );
        }
      } catch {
        if (active) setWaiters([]);
      } finally {
        if (active) setLoadingWaiters(false);
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

  const submit = useCallback(
    async (enteredPin: string) => {
      if (!selected || submitting) return;
      setSubmitting(true);
      try {
        const user = await login(selectedName.trim(), enteredPin);
        toast.success(`Welcome, ${user.full_name || user.username}`);
        router.replace("/waiter/create-order");
      } catch (err: any) {
        toast.error(err?.message || "Login failed");
        setPin("");
        triggerShake();
      } finally {
        setSubmitting(false);
      }
    },
    [selected, selectedName, submitting, login, router, triggerShake],
  );

  const pressDigit = useCallback(
    (digit: string) => {
      if (submitting) return;
      setPin((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = prev + digit;
        if (next.length === PIN_LENGTH) {
          // Auto-submit once the PIN is complete (POS-style).
          setTimeout(() => submit(next), 120);
        }
        return next;
      });
    },
    [submitting, submit],
  );

  const goBack = useCallback(() => {
    setSelected(null);
    setPin("");
  }, []);

  // Keyboard support on the PIN screen.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") pressDigit(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Escape") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, pressDigit, goBack]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/60 to-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <style>{`
        @keyframes wp-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        @keyframes wp-pop {
          0% { transform: scale(0.6); opacity: 0.4; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .wp-shake { animation: wp-shake 0.4s ease-in-out; }
        .wp-pop { animation: wp-pop 0.2s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
      `}</style>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-card/85 backdrop-blur-md border border-border/70 rounded-3xl shadow-2xl shadow-amber-200/30 p-8">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-amber-500 text-primary-foreground shadow-lg shadow-amber-300/40 mb-4">
              <Coffee className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Waiter Sign In
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">
              {selected
                ? "Enter your 4-digit PIN to continue"
                : "Choose your name to take and manage table orders"}
            </p>
            {deviceLabel ? (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-[11px] font-bold text-amber-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                {deviceLabel}
              </span>
            ) : null}
          </div>

          {/* ── Phase 1: pick your name ─────────────────────────────── */}
          {!selected ? (
            <div>
              {loadingWaiters ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Loading staff…
                  </span>
                </div>
              ) : waiters.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground font-medium">
                  No café waiters found for this branch. Ask an admin to add a
                  waiter account, then try again.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[20rem] overflow-y-auto pr-1">
                  {waiters.map((w) => {
                    const label =
                      w.full_name || w.name || w.username || "Unknown";
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setSelected(w);
                          setPin("");
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
            /* ── Phase 2: PIN keypad ──────────────────────────────── */
            <div className="space-y-5">
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-full bg-background/70 border border-border px-3 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Switch user
              </button>

              {/* Selected user */}
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

              {/* PIN dots */}
              <div
                className={`flex items-center justify-between px-1 ${shake ? "wp-shake" : ""}`}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <Lock className="h-3 w-3 text-primary" />
                  Security PIN
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {pin.length}/{PIN_LENGTH}
                </span>
              </div>
              <div
                className={`flex justify-center gap-4 ${shake ? "wp-shake" : ""}`}
              >
                {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                  const filled = pin.length > i;
                  return (
                    <div
                      key={i}
                      className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center transition ${
                        filled
                          ? "border-primary bg-primary/5"
                          : pin.length === i
                            ? "border-amber-400 bg-amber-50"
                            : "border-border bg-muted/20"
                      }`}
                    >
                      {filled ? (
                        <span className="h-3 w-3 rounded-full bg-primary wp-pop" />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => pressDigit(String(n))}
                    disabled={submitting}
                    className="h-14 rounded-2xl border-2 border-border bg-background text-2xl font-black text-foreground shadow-sm transition hover:border-primary/60 hover:bg-primary/5 active:scale-95 disabled:opacity-50"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin("")}
                  disabled={submitting}
                  className="h-14 rounded-2xl border-2 border-rose-200 bg-rose-50 flex flex-col items-center justify-center text-rose-500 transition hover:border-rose-400 active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Clear
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => pressDigit("0")}
                  disabled={submitting}
                  className="h-14 rounded-2xl border-2 border-border bg-background text-2xl font-black text-foreground shadow-sm transition hover:border-primary/60 hover:bg-primary/5 active:scale-95 disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPin((p) => p.slice(0, -1))}
                  disabled={submitting}
                  className="h-14 rounded-2xl border-2 border-amber-200 bg-amber-50 flex flex-col items-center justify-center text-amber-600 transition hover:border-amber-400 active:scale-95 disabled:opacity-50"
                >
                  <Delete className="h-5 w-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Delete
                  </span>
                </button>
              </div>

              {submitting ? (
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </div>
              ) : null}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-8">
          © Syntax Software Solution
        </p>
      </div>
    </div>
  );
}
