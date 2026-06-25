import {
  check,
  type Update,
  type DownloadEvent,
} from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";

/**
 * Thin wrapper around the Tauri updater plugin. All update flow logic for the
 * desktop app lives here so the UI layer (UpdateManager, settings page) only
 * deals with high-level state.
 *
 * Updates are published as GitHub Releases by the CI workflow; the desktop app
 * reads `latest.json` from the latest release, verifies the minisign signature
 * against the pubkey baked into tauri.conf.json, then downloads + installs.
 */

export interface UpdateProgress {
  /** Total bytes to download, when the server reports a content length. */
  total: number | null;
  /** Bytes downloaded so far. */
  downloaded: number;
}

export interface AvailableUpdate {
  version: string;
  currentVersion: string;
  /** Release notes / body from latest.json, if provided. */
  notes?: string;
  date?: string;
  /** The underlying plugin handle, used to drive download + install. */
  handle: Update;
}

/** True only inside the Tauri shell — the updater is a no-op in the browser. */
export function isDesktopRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Returns the currently running app version (from tauri.conf.json). */
export async function getCurrentVersion(): Promise<string> {
  if (!isDesktopRuntime()) return "dev";
  try {
    return await getVersion();
  } catch {
    return "unknown";
  }
}

/**
 * Asks the update endpoint whether a newer release exists.
 * Returns `null` when already up to date or when not running in the desktop shell.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isDesktopRuntime()) return null;

  console.log("Checking for update…");

  const update = await check();
  console.log("checkForUpdate", update);
  if (!update) return null;

  return {
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body ?? undefined,
    date: update.date ?? undefined,
    handle: update,
  };
}

/**
 * Downloads and installs an update, reporting progress as bytes arrive.
 * On Windows the running app exits during install, so callers should not assume
 * any code runs after this resolves there — call `relaunchApp()` to restart.
 */
export async function downloadAndInstall(
  update: AvailableUpdate,
  onProgress?: (progress: UpdateProgress) => void,
): Promise<void> {
  let downloaded = 0;
  let total: number | null = null;

  await update.handle.downloadAndInstall((event: DownloadEvent) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? null;
        downloaded = 0;
        onProgress?.({ total, downloaded });
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        onProgress?.({ total, downloaded });
        break;
      case "Finished":
        onProgress?.({ total, downloaded: total ?? downloaded });
        break;
    }
  });
}

/** Restarts the app so a freshly installed update takes effect. */
export async function relaunchApp(): Promise<void> {
  if (!isDesktopRuntime()) return;
  await relaunch();
}
