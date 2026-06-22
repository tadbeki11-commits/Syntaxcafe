"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  WifiOff,
  RefreshCw,
  MonitorSmartphone,
  Loader2,
  QrCode,
  X,
} from "lucide-react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { enrollDevice, isDeviceEnrolled } from "@/lib/cashier/device";

/**
 * Enrollment QR codes encode the branch's plain enrollment code. Tolerate a
 * JSON wrapper ({ "code": "..." }) too, in case the admin format evolves.
 */
function extractCode(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.code === "string") return parsed.code.trim();
  } catch {
    /* not JSON — treat as a bare code */
  }
  return trimmed;
}

/**
 * First-run screen for the cashier portal. The operator redeems the reusable
 * enrollment code minted by an owner/platform admin for a specific branch,
 * pinning all subsequent traffic to that branch.
 */
export default function CashierEnrollPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [checkingConn, setCheckingConn] = useState(false);

  const checkConnection = useCallback(() => {
    setCheckingConn(true);
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    setCheckingConn(false);
  }, []);

  useEffect(() => {
    if (isDeviceEnrolled()) {
      router.replace("/cashier/login");
      return;
    }
    checkConnection();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection, router]);

  const submitCode = useCallback(
    async (rawCode: string) => {
      if (submitting) return;
      const trimmed = rawCode.trim();
      if (!trimmed) {
        setError("Please enter the enrollment code.");
        return;
      }

      setSubmitting(true);
      setError(null);
      try {
        await enrollDevice(trimmed, deviceName);
        router.replace("/cashier/login");
      } catch (err: any) {
        const message =
          err?.message || "Enrollment failed. Check the code and try again.";
        setError(Array.isArray(message) ? message.join(", ") : message);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, deviceName, router],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCode(code);
  };

  const handleScan = useCallback(
    (results: IDetectedBarcode[]) => {
      const raw = results?.[0]?.rawValue;
      if (!raw) return;
      const scanned = extractCode(raw).toUpperCase();
      setScanning(false);
      setCode(scanned);
      submitCode(scanned);
    },
    [submitCode],
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 to-slate-100 flex flex-col justify-center items-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {!isOnline && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-300 bg-destructive/10 px-4 py-3 shadow-sm">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-destructive">
                No internet connection
              </p>
              <p className="text-xs text-destructive/80 mt-0.5">
                Enrolling this device requires an active internet connection.
                Please connect and try again.
              </p>
            </div>
            <button
              onClick={checkConnection}
              disabled={checkingConn}
              className="shrink-0 rounded-lg p-1.5 text-destructive hover:bg-destructive/15 transition-colors disabled:opacity-50"
              title="Retry connection"
            >
              <RefreshCw
                className={`h-4 w-4 ${checkingConn ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        )}

        <div className="bg-card/80 backdrop-blur border border-border rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <MonitorSmartphone className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Set up this device
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Scan the QR code from your administrator — or enter the enrollment
              code manually — to link this cashier station to its branch.
            </p>
          </div>

          {scanning ? (
            <div className="mb-4 space-y-3">
              <div className="overflow-hidden rounded-xl border border-border bg-black">
                <Scanner
                  onScan={handleScan}
                  onError={() =>
                    setError(
                      "Couldn't access the camera. Allow camera access or enter the code manually.",
                    )
                  }
                  formats={["qr_code"]}
                  components={{ finder: true }}
                  styles={{ container: { width: "100%" } }}
                />
              </div>
              <button
                type="button"
                onClick={() => setScanning(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted">
                <X className="h-4 w-4" />
                Cancel scan
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setScanning(true);
              }}
              disabled={submitting}
              className="mb-4 w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50">
              <QrCode className="h-4 w-4" />
              Scan QR code
            </button>
          )}

          {!scanning && (
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                or enter manually
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="enrollment-code"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Enrollment code
              </label>
              <input
                id="enrollment-code"
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (error) setError(null);
                }}
                placeholder="e.g. A1B2C3D4E5F6"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-lg font-mono tracking-[0.2em] text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-60"
                disabled={submitting}
              />
            </div>

            <div>
              <label
                htmlFor="device-name"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Device name{" "}
                <span className="normal-case font-normal text-muted-foreground/70">
                  (optional)
                </span>
              </label>
              <input
                id="device-name"
                type="text"
                autoComplete="off"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Cashier Counter"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-60"
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="text-sm font-semibold text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enrolling…
                </>
              ) : (
                "Enroll device"
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-muted-foreground font-semibold mt-8">
          <a
            href="https://syntaxsoftwaresolution.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors text-[10px] uppercase tracking-wider block"
          >
            © Syntax Software Solution
          </a>
        </div>
      </div>
    </div>
  );
}
