import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AvailableUpdate,
  type UpdateProgress,
  checkForUpdate,
  downloadAndInstall,
  getCurrentVersion,
  isDesktopRuntime,
  relaunchApp,
} from "@/infrastructure/updater/updater";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "uptodate"
  | "error";

export interface UseAppUpdater {
  status: UpdateStatus;
  currentVersion: string;
  update: AvailableUpdate | null;
  progress: UpdateProgress | null;
  /** 0–100, or null when the server does not report a content length. */
  percent: number | null;
  error: string | null;
  isDesktop: boolean;
  /** Manually trigger a check. `silent` suppresses the "up to date" state flip. */
  check: (silent?: boolean) => Promise<AvailableUpdate | null>;
  /** Download + install the pending update, then relaunch. */
  install: () => Promise<void>;
  dismiss: () => void;
}

/**
 * Drives the desktop in-app update flow. A single instance is mounted globally
 * (UpdateManager) to auto-check on startup; the settings page mounts its own
 * instance for the manual "Check for updates" button.
 */
export function useAppUpdater(): UseAppUpdater {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [currentVersion, setCurrentVersion] = useState("");
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDesktop = isDesktopRuntime();
  // Guards against overlapping checks/installs (e.g. auto-check + a fast click).
  const busy = useRef(false);

  useEffect(() => {
    void getCurrentVersion().then(setCurrentVersion);
  }, []);

  const check = useCallback(
    async (silent = false): Promise<AvailableUpdate | null> => {
      if (!isDesktop || busy.current) return null;
      busy.current = true;
      setError(null);
      setStatus("checking");
      try {
        const found = await checkForUpdate();

        if (found) {
          setUpdate(found);
          setStatus("available");
        } else {
          setUpdate(null);
          setStatus(silent ? "idle" : "uptodate");
        }
        return found;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        // A failed background check shouldn't nag the user with an error UI.
        setStatus(silent ? "idle" : "error");
        return null;
      } finally {
        busy.current = false;
      }
    },
    [isDesktop],
  );

  const install = useCallback(async () => {
    if (!update || busy.current) return;
    busy.current = true;
    setError(null);
    setStatus("downloading");
    setProgress({ total: null, downloaded: 0 });
    try {
      await downloadAndInstall(update, setProgress);
      setStatus("ready");
      // On Windows the process exits inside install; relaunch covers the rest.
      await relaunchApp();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }, [update]);

  const dismiss = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const percent =
    progress && progress.total
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : null;

  return {
    status,
    currentVersion,
    update,
    progress,
    percent,
    error,
    isDesktop,
    check,
    install,
    dismiss,
  };
}
