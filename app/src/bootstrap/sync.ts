import { syncEngine } from '@/infrastructure/sync/sync-engine';

export const startSyncServices = (): void => {
  if (typeof window !== 'undefined') {
    (window as any).triggerSync = () => syncEngine.sync();
  }
};

export { syncEngine };
