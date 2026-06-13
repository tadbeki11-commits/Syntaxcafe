import { getCurrentWindow } from '@tauri-apps/api/window';
import { clearMenuTables } from '@/db/localDb';

let registered = false;

// Clears all menu tables whenever the app window is about to close.
export async function registerClearMenuOnClose(): Promise<void> {
  if (registered) return;
  if (typeof window === 'undefined') return;

  let appWindow: ReturnType<typeof getCurrentWindow>;
  try {
    appWindow = getCurrentWindow();
  } catch {
    // Not running inside Tauri (e.g. plain browser); nothing to do.
    return;
  }

  registered = true;

  await appWindow.onCloseRequested(async (event) => {
    event.preventDefault();
    try {
      await clearMenuTables();
    } catch (error) {
      console.error('[ClearMenuOnClose] Failed to clear menu tables:', error);
    } finally {
      await appWindow.destroy();
    }
  });
}
