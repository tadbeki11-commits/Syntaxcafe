import { syncEngine } from '@/infrastructure/sync/sync-engine';
import { startRealtimeSync } from '@/infrastructure/realtime/realtime-sync';

export const startSyncServices = (): void => {
  if (typeof window !== 'undefined') {
    (window as any).triggerSync = () => syncEngine.sync();
  }
  // Instant path: persist backend-pushed order changes into the local DB the
  // moment they happen (while online), app-wide.
  startRealtimeSync();
  // Safety net: keep pushing offline work and pulling latest states on an
  // interval so the app stays current without a manual "Sync" press.
  syncEngine.startAutoSync();
};

export { syncEngine };
