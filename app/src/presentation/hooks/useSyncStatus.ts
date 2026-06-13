import { useEffect, useState } from 'react';
import { syncEngine, type SyncStatusCallback } from '@/infrastructure/sync/sync-engine';
export const useSyncStatus = () => {
  const [status, setStatus] = useState({
    online: syncEngine.isAppOnline(),
    syncing: syncEngine.isSyncingInProgress(),
    unsyncedCount: 0,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((next) => {
      setStatus(next);
    });
    return unsubscribe;
  }, []);

  const sync = async () => {
    return syncEngine.sync();
  };

  return { ...status, sync };
};

export type { SyncStatusCallback };
