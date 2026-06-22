import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLoginForm } from './hooks/useLoginForm';
import { useLoginPhase } from './hooks/useLoginPhase';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import syncEngine from '@/infrastructure/sync/sync-engine';
import { WifiOff, RefreshCw } from 'lucide-react';

const LoginPageContainer = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // ─── Online gate ──────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [checkingConn, setCheckingConn] = useState<boolean>(true);

  const checkConnection = useCallback(async () => {
    setCheckingConn(true);
    const online = await syncEngine.verifyConnection();
    setIsOnline(online);
    setCheckingConn(false);
  }, []);

  // Probe on mount and every 10 s
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
  // ─────────────────────────────────────────────────────────────────────────

  const {
    loginPhase,
    selectedUser,
    employees,
    selectUser,
    goToAdminLogin,
    goBackToUserSelection
  } = useLoginPhase();

  const form = useLoginForm(loginPhase);

  const usernameRef = useRef<HTMLInputElement>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Hard-block login if offline
    if (!isOnline) return;

    if (!form.validateForm(loginPhase)) return;

    form.setIsLoading(true);

    try {
      let result: any = { success: false };

      if (loginPhase === 'pin-entry') {
        result = await login(
          { name: form.formData.username, pin: form.formData.pin },
          'pin'
        );
      } else if (loginPhase === 'admin') {
        result = await login(
          { username: form.formData.username, password: form.formData.password },
          'traditional'
        );

        if (!result?.success) {
          result = await login(
            { name: form.formData.username, password: form.formData.password },
            'staff'
          );
        }
        if (!result?.success) {
          result = await login(
            { name: form.formData.username, pin: form.formData.password },
            'pin'
          );
        }
      }

      if (result?.success && result?.user) {
        // login() hydrates the essentials in the background, so navigate immediately.
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      form.setIsLoading(false);
    }
  };

  // Handle user selection — block when offline
  const handleUserSelect = (user: any) => {
    if (!isOnline) return;
    selectUser(user);
    form.setFormData(prev => ({
      ...prev,
      username: user.username || user.full_name || '',
      pin: ''
    }));
    form.setErrors({});
  };

  // Handle back button
  const handleBack = () => {
    goBackToUserSelection();
    form.resetForm();
  };

  // Auto-focus management
  useEffect(() => {
    if (loginPhase === 'pin-entry') {
      setTimeout(() => usernameRef.current?.focus(), 100);
    }
  }, [loginPhase]);

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center p-4 overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
      {/* Subtle dotted grid */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(hsl(var(--muted-foreground) / 0.18) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)',
        }}
      />

      {/* Soft ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/[0.07] rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-info/[0.08] rounded-full blur-3xl animate-pulse animation-delay-2000" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-md relative z-10">

        {/* ── Offline banner ─────────────────────────────────────────────── */}
        {!isOnline && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-300 bg-destructive/10 dark:bg-red-950/40 dark:border-red-800 px-4 py-3 animate-fade-in shadow-sm">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-destructive dark:text-red-400">No internet connection</p>
              <p className="text-xs text-destructive/80 dark:text-red-400/70 mt-0.5">
                An active internet connection is required to sign in. Please check your network and try again.
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
        {/* ─────────────────────────────────────────────────────────────── */}


        {loginPhase === 'admin' && (
          <AdminLoginScreen
            formData={{ username: form.formData.username, password: form.formData.password }}
            errors={form.errors}
            isLoading={form.isLoading}
            showPassword={form.showPassword}
            onUsernameChange={form.handleChange}
            onPasswordChange={form.handleChange}
            onTogglePassword={() => form.setShowPassword(!form.showPassword)}
            onSubmit={handleSubmit}
            onBack={handleBack}
            disabled={!isOnline}
          />
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <a
            href="https://syntaxsoftwaresolution.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            © Syntax Software Solution
          </a>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default LoginPageContainer;

