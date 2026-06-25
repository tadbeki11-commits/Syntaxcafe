import { useEffect, useRef } from 'react';
import { Download, RefreshCw, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppUpdater } from '@/hooks/useAppUpdater';

/**
 * Mounted once globally (see App.tsx). Silently checks for a new desktop
 * release shortly after launch and, if one is found, prompts the user to
 * install it. The manual "Check for updates" control lives in the settings
 * page (AppUpdateSettings) and uses its own hook instance.
 */
export default function UpdateManager() {
  const { status, update, percent, error, isDesktop, check, install, dismiss } =
    useAppUpdater();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!isDesktop || checkedRef.current) return;
    checkedRef.current = true;
    // Delay slightly so startup work (DB hydrate, sync bootstrap) isn't
    // competing with the network check. `silent` keeps failures quiet.
    const timer = window.setTimeout(() => void check(true), 4000);
    return () => window.clearTimeout(timer);
  }, [isDesktop, check]);

  const open =
    status === 'available' ||
    status === 'downloading' ||
    status === 'ready' ||
    (status === 'error' && update !== null);

  const busy = status === 'downloading' || status === 'ready';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Update available
          </DialogTitle>
          <DialogDescription>
            {update
              ? `Version ${update.version} is ready to install. You're currently on ${update.currentVersion}.`
              : 'A new version is ready to install.'}
          </DialogDescription>
        </DialogHeader>

        {update?.notes ? (
          <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
            {update.notes}
          </div>
        ) : null}

        {status === 'downloading' || status === 'ready' ? (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${percent ?? (status === 'ready' ? 100 : 10)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {status === 'ready'
                ? 'Installed — restarting…'
                : percent !== null
                  ? `Downloading… ${percent}%`
                  : 'Downloading…'}
            </p>
          </div>
        ) : null}

        {status === 'error' && error ? (
          <p className="text-xs text-destructive">Update failed: {error}</p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          {!busy ? (
            <Button variant="outline" onClick={dismiss}>
              Later
            </Button>
          ) : null}
          <Button onClick={() => void install()} disabled={busy}>
            {status === 'error' ? (
              <>
                <RefreshCw className="h-4 w-4" /> Retry
              </>
            ) : busy ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Installing…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Install &amp; restart
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
