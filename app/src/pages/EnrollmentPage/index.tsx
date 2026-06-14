import React, { useCallback, useEffect, useState } from 'react';
import { WifiOff, RefreshCw, MonitorSmartphone, Loader2 } from 'lucide-react';
import syncEngine from '@/infrastructure/sync/sync-engine';
import { enrollDevice } from '@/infrastructure/api/device-enrollment';

interface EnrollmentPageProps {
  /** Called once the device has successfully redeemed a code for a token. */
  onEnrolled: () => void;
}

/**
 * First-run screen shown when the desktop app has no device token yet. The
 * operator pastes the one-time enrollment code minted by an owner/platform admin
 * for a specific branch; redeeming it stores a long-lived token that pins all
 * subsequent traffic to that branch.
 */
const EnrollmentPage: React.FC<EnrollmentPageProps> = ({ onEnrolled }) => {
  const [code, setCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Online gate (mirrors LoginPage) ───────────────────────────────────────
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [checkingConn, setCheckingConn] = useState<boolean>(true);

  const checkConnection = useCallback(async () => {
    setCheckingConn(true);
    const online = await syncEngine.verifyConnection();
    setIsOnline(online);
    setCheckingConn(false);
  }, []);

  useEffect(() => {
    checkConnection();
    const timer = setInterval(checkConnection, 10_000);
    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);
  // ───────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline || submitting) return;

    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter the enrollment code.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await enrollDevice(trimmed, deviceName);
      onEnrolled();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Enrollment failed. Check the code and try again.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col justify-center items-center p-4 overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 dark:bg-info/20/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200/20 dark:bg-purple-900/20 rounded-full blur-3xl animate-pulse animation-delay-2000" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Offline banner */}
        {!isOnline && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-300 bg-destructive/10 dark:bg-red-950/40 dark:border-red-800 px-4 py-3 animate-fade-in shadow-sm">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-destructive dark:text-red-400">No internet connection</p>
              <p className="text-xs text-destructive/80 dark:text-red-400/70 mt-0.5">
                Enrolling this device requires an active internet connection. Please connect and try again.
              </p>
            </div>
            <button
              onClick={checkConnection}
              disabled={checkingConn}
              className="shrink-0 rounded-lg p-1.5 text-destructive hover:bg-destructive/15 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
              title="Retry connection"
            >
              <RefreshCw className={`h-4 w-4 ${checkingConn ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        <div className="bg-card/80 backdrop-blur border border-border rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <MonitorSmartphone className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Set up this device</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Enter the enrollment code from your administrator to link this device to its branch.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="enrollment-code" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
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
                disabled={!isOnline || submitting}
              />
            </div>

            <div>
              <label htmlFor="device-name" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Device name <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
              </label>
              <input
                id="device-name"
                type="text"
                autoComplete="off"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Front Counter POS"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-60"
                disabled={!isOnline || submitting}
              />
            </div>

            {error && (
              <p className="text-sm font-semibold text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={!isOnline || submitting || !code.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enrolling…
                </>
              ) : (
                'Enroll device'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground font-semibold mt-8 space-y-2">
          <div className="flex justify-center">
            <img
              src="/assets/logo.png?v=8"
              alt="Logo"
              className="w-8 h-8 object-contain opacity-60"
            />
          </div>
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
};

export default EnrollmentPage;
