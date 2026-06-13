import { useEffect, useState } from 'react';
import { syncEngine } from '@/infrastructure/sync/sync-engine';

/**
 * Live online flag sourced from the sync engine's connectivity probe. Use this
 * to gate admin write controls (admin actions are online-only — there is no
 * local queue for them). Components that already track `syncStatus` can keep
 * using that; this hook is for pages that don't.
 */
export function useSyncOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() => syncEngine.isAppOnline());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setOnline(status.online);
    });
    return unsubscribe;
  }, []);

  return online;
}
