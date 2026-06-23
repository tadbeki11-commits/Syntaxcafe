import { useEffect, useRef } from "react";
import { syncEngine } from "@/infrastructure/sync/sync-engine";

/**
 * Runs `onSyncComplete` whenever a sync cycle finishes — i.e. the engine
 * transitions from syncing → idle — OR when the realtime bridge persists a
 * backend-pushed change into the local DB (the `local-data-changed` event).
 *
 * Most adapters read from the local DB when online, so pages that mount before
 * a sync has populated that data would otherwise show stale/empty results and
 * never refresh. This covers every case where local data lands after a page is
 * already on screen: the post-login background hydration, the automatic
 * reconnect flush, periodic auto-sync, manual "Sync" presses, and instant
 * realtime pushes (e.g. an order cancelled on the web cashier).
 *
 * The callback is held in a ref so callers can pass a fresh inline closure each
 * render without re-subscribing.
 */
export function useSyncRefetch(onSyncComplete: () => void): void {
  const callbackRef = useRef(onSyncComplete);
  callbackRef.current = onSyncComplete;

  const wasSyncing = useRef(false);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      if (wasSyncing.current && !status.syncing) {
        callbackRef.current();
      }
      wasSyncing.current = status.syncing;
    });

    const onLocalChange = () => callbackRef.current();
    if (typeof window !== "undefined") {
      window.addEventListener("local-data-changed", onLocalChange);
    }

    return () => {
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("local-data-changed", onLocalChange);
      }
    };
  }, []);
}

export default useSyncRefetch;
