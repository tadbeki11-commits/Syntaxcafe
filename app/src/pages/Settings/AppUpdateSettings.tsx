import { CheckCircle2, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppUpdater } from '@/hooks/useAppUpdater';


export default function AppUpdateSettings() {
  const { status, currentVersion, update, percent, error, isDesktop, check, install } =
    useAppUpdater();

  const checking = status === 'checking';
  const busy = status === 'downloading' || status === 'ready';

  return (
    <div className="space-y-6 p-5">
      <PageHeader
        title="App Updates"
        description="Check for and install the latest version of the desktop app."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Version</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current version</p>
              <p className="text-lg font-semibold text-foreground">
                {currentVersion || '—'}
              </p>
            </div>
            {!busy && (
              <Button
                variant="outline"
                onClick={() => void check(false)}
                disabled={!isDesktop || checking}
              >
                <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking…' : 'Check for updates'}
              </Button>
            )}
          </div>

          {!isDesktop && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Updates are only available in the installed desktop app.
            </p>
          )}

          {status === 'uptodate' && (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              You're on the latest version.
            </p>
          )}

          {(status === 'available' || busy) && update && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">
                Version {update.version} is available
              </p>
              {update.notes && (
                <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {update.notes}
                </div>
              )}

              {busy ? (
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
              ) : (
                <Button onClick={() => void install()}>
                  <Download className="h-4 w-4" /> Install &amp; restart
                </Button>
              )}
            </div>
          )}

          {status === 'error' && error && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
