import { useEffect, useState } from "react";
import {
  syncEngine,
  type SyncProgress,
} from "@/infrastructure/sync/sync-engine";

/**
 * Subscribe to the running sync cycle's task progress. Returns the latest
 * snapshot ({ active, completed, total, task }) and re-renders as it advances.
 */
export function useSyncProgress(): SyncProgress {
  const [progress, setProgress] = useState<SyncProgress>({
    active: false,
    completed: 0,
    total: 0,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribeProgress(setProgress);
    return () => unsubscribe();
  }, []);

  return progress;
}

export default useSyncProgress;
