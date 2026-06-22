import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { syncEngine } from "@/infrastructure/sync/sync-engine";
import { useSyncOnline } from "@/hooks/useSyncOnline";
import {
  getActiveCleanupRequest,
  completeCleanupRequest,
} from "@/infrastructure/api/data-cleanup";
import { wipeAllLocalDataKeepEnrollment } from "@/db/localDb";

const POLL_INTERVAL_MS = 30_000;

/**
 * Background watcher for owner-approved data cleanup. While online, it polls the
 * backend for this device's active cleanup request. When the owner approves it,
 * the device pushes any unsynced work, then (only if fully synced) clears its
 * local tables and tells the backend to wipe the branch's orders/payments.
 *
 * "Push-then-wipe": if the device is offline or still has unsynced records after
 * a sync attempt, the wipe is deferred until the next poll so nothing is lost.
 * Renders nothing — mount once at the app root.
 */
const CleanupApprovalWatcher = () => {
  const online = useSyncOnline();
  // Guards against the async wipe overlapping itself across polls.
  const wipingRef = useRef(false);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;

    const runWipe = async (id: string) => {
      if (wipingRef.current) return;
      wipingRef.current = true;
      try {
        // Push everything first; only proceed from a clean, fully-synced state.
        await syncEngine.sync();
        const unsynced = await syncEngine.getUnsyncedCount();
        if (unsynced > 0) {
          toast(
            `Data cleanup approved — finishing sync (${unsynced} record${
              unsynced === 1 ? "" : "s"
            } pending) before clearing.`,
          );
          return; // retry on the next poll
        }

        // Backend drops this branch's orders/payments and marks it completed.
        await completeCleanupRequest(id);
        await wipeAllLocalDataKeepEnrollment();
        toast.success("Local data cleared. Reloading…");
        setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        console.error("[CleanupApprovalWatcher] Wipe failed:", error);
        toast.error("Data cleanup failed. It will retry shortly.");
      } finally {
        wipingRef.current = false;
      }
    };

    const poll = async () => {
      if (cancelled || wipingRef.current) return;
      try {
        const request = await getActiveCleanupRequest();
        if (!cancelled && request?.status === "approved") {
          await runWipe(request.id);
        }
      } catch {
        // Offline / transient — ignore and try again next interval.
      }
    };

    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [online]);

  return null;
};

export default CleanupApprovalWatcher;
