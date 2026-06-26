import { useEffect, useRef, useState } from "react";
import { useSyncProgress } from "@/hooks/useSyncProgress";

/**
 * Minimal NProgress-style top bar that visualizes the background sync cycle
 * (e.g. the post-login hydration). Shows a thin animated bar pinned to the top
 * of the viewport plus a small "Syncing N%" chip, then snaps to 100% and fades
 * out when the cycle finishes.
 */
export const SyncProgressBar = () => {
  const progress = useSyncProgress();
  const [visible, setVisible] = useState(false);
  const [percent, setPercent] = useState(0);
  const startedRef = useRef(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    // Background cycles (auto-sync tick, reconnect flush) are marked silent — do
    // not surface them in the header. They still sync + refresh data; we just
    // don't flash the "Syncing N%" bar on every routine tick.
    if (progress.silent) {
      return;
    }

    if (progress.active) {
      startedRef.current = true;
      const ratio =
        progress.total > 0 ? progress.completed / progress.total : 0;
      // Keep it in a visibly "working" range: never sit at 0, never reach 100
      // until the cycle actually finishes.
      const next = Math.min(92, Math.max(8, Math.round(ratio * 100)));
      setVisible(true);
      setPercent((prev) => (next > prev ? next : prev));
    } else if (startedRef.current) {
      startedRef.current = false;
      setPercent(100);
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
        setPercent(0);
      }, 450);
    }

    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [progress.active, progress.completed, progress.total, progress.silent]);

  if (!visible) return null;

  const done = percent >= 100;

  return (
    <>
      {/* Top progress bar */}
      <div
        className="fixed inset-x-0 top-0 z-[100] h-0.5 pointer-events-none"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary transition-[width,opacity] duration-300 ease-out"
          style={{
            width: `${percent}%`,
            opacity: done ? 0 : 1,
            boxShadow:
              "0 0 8px hsl(var(--primary)), 0 0 3px hsl(var(--primary))",
          }}
        />
      </div>

      {/* Status chip */}
      <div
        className="fixed right-3 top-3 z-[100] pointer-events-none transition-opacity duration-300"
        style={{ opacity: done ? 0 : 1 }}
      >
        <div className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Syncing {percent}%
        </div>
      </div>
    </>
  );
};

export default SyncProgressBar;
