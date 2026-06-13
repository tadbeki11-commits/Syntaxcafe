import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe, RefreshCw, UploadCloud, DownloadCloud } from 'lucide-react';
import { SyncFormData, SyncMetaData } from '../types';

interface SyncManagementCardProps {
  syncForm: SyncFormData;
  setSyncForm: React.Dispatch<React.SetStateAction<SyncFormData>>;
  syncMeta: SyncMetaData;
  remoteStatus: any;
  syncBusy: string;
  refreshRemoteStatus: () => void;
  saveSyncConfig: () => void;
  runSyncAction: (action: string) => void;
}

export const SyncManagementCard: React.FC<SyncManagementCardProps> = ({
  syncForm,
  setSyncForm,
  syncMeta,
  remoteStatus,
  syncBusy,
  refreshRemoteStatus,
  saveSyncConfig,
  runSyncAction
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <span>Desktop Sync to Hosted Domain</span>
          </CardTitle>
          <CardDescription>Provision backend sync status</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshRemoteStatus}
            disabled={syncBusy !== ''}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncBusy === 'remote-status' ? 'animate-spin' : ''}`} />
            Test Domain
          </Button>
          <Button
            size="sm"
            onClick={saveSyncConfig}
            disabled={syncBusy !== ''}
          >
            {syncBusy === 'save-sync' ? 'Saving...' : 'Save Sync Settings'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="sync-enabled"
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                checked={syncForm.enabled}
                onChange={(e) => setSyncForm((prev: any) => ({ ...prev, enabled: e.target.checked }))}
              />
              <Label htmlFor="sync-enabled" className="text-xs font-semibold cursor-pointer">
                Enable background sync from desktop to hosted domain
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Hosted domain URL</Label>
              <Input
                type="url"
                value={syncForm.remoteUrl}
                onChange={(e) => setSyncForm((prev) => ({ ...prev, remoteUrl: e.target.value }))}
                placeholder="https://cafenet.adebingobot.com"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Sync token</Label>
              <Input
                type="password"
                value={syncForm.token}
                onChange={(e) => setSyncForm((prev) => ({ ...prev, token: e.target.value }))}
                placeholder={syncMeta.hasToken ? 'Leave blank to keep existing token' : 'Optional shared sync token'}
              />
              <p className="text-[10px] text-muted-foreground font-semibold">
                {syncMeta.hasToken ? 'A token is already saved locally.' : 'If your hosted server requires a sync token, enter it here.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Sync interval (milliseconds)</Label>
              <Input
                type="number"
                min="10000"
                max="900000"
                step="1000"
                value={syncForm.intervalMs}
                onChange={(e) => setSyncForm((prev) => ({ ...prev, intervalMs: Number(e.target.value || 30000) }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border p-4 bg-muted/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Background sync</span>
                <Badge variant={syncForm.enabled ? 'success' : 'secondary'}>
                  {syncForm.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Pending local changes</span>
                <Badge variant={syncMeta.hasPendingChanges ? 'warning' : 'success'}>
                  {syncMeta.hasPendingChanges ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Last push status</span>
                <span className="font-bold text-foreground">{syncMeta.lastResponseStatus ?? '—'}</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold pt-2 border-t space-y-1">
                <div>Last attempt: {syncMeta.lastAttemptAt ? new Date(syncMeta.lastAttemptAt).toLocaleString() : 'Never'}</div>
                <div>Last success: {syncMeta.lastSuccessAt ? new Date(syncMeta.lastSuccessAt).toLocaleString() : 'Never'}</div>
                <div>Last error: {syncMeta.lastError || 'None'}</div>
              </div>
            </div>

            <div className="rounded-xl border p-4 bg-muted/40 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Hosted domain health</span>
                <Badge variant={remoteStatus?.success ? 'success' : remoteStatus ? 'destructive' : 'secondary'}>
                  {remoteStatus?.success ? 'Reachable' : remoteStatus ? 'Unavailable' : 'Not tested'}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {remoteStatus?.error || remoteStatus?.remote?.message || remoteStatus?.remote?.status || 'Use Test Domain to verify the deployed server.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => runSyncAction('push')}
                disabled={syncBusy !== ''}
                size="sm"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                {syncBusy === 'push' ? 'Pushing...' : 'Push Desktop Data'}
              </Button>
              <Button
                onClick={() => runSyncAction('pull')}
                disabled={syncBusy !== ''}
                variant="outline"
                size="sm"
              >
                <DownloadCloud className="w-4 h-4 mr-2" />
                {syncBusy === 'pull' ? 'Pulling...' : 'Pull Hosted Data'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncManagementCard;
