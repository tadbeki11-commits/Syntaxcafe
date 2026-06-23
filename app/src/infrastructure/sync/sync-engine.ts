import api from "@/application";
import toast from "react-hot-toast";
import { syncTasks, type SyncTask, type SyncTaskResult } from "./tasks";
import { getSessionUser } from "@/shared/utils/sessionUser";

export type SyncStatusCallback = (status: {
  online: boolean;
  syncing: boolean;
  unsyncedCount: number;
}) => void;

export type SyncProgress = {
  /** Whether a sync cycle is currently running. */
  active: boolean;
  /** Number of tasks finished in the current cycle. */
  completed: number;
  /** Total tasks in the current cycle. */
  total: number;
  /** Name of the task currently running (for status display). */
  task?: string;
};

export type SyncProgressCallback = (progress: SyncProgress) => void;

/**
 * Tasks that run automatically (e.g. right after login): the data the app needs
 * to be usable immediately — authentication (users/roles), menu, settings, and
 * today's orders (so the cashier sees orders created on other devices, like the
 * web waiter app). Everything else — payments, inventory, tables, organizations,
 * stock locations/transfers — is only pushed/pulled on an explicit manual
 * "Sync" button press.
 */
export const AUTO_SYNC_TASKS: readonly string[] = [
  "users_pull",
  "roles_pull",
  "menu_items_pull",
  "settings_pull",
  "orders",
  "orders_pull",
  "expenses",
];

// Tasks run automatically when connectivity is restored mid-session: flush any
// offline-created orders/expenses to the server, then reconcile today's list.
export const RECONNECT_SYNC_TASKS: readonly string[] = [
  "orders",
  "orders_pull",
  "expenses",
];

class SimpleSyncEngine {
  private online: boolean =
    typeof navigator !== "undefined" ? navigator.onLine : true;
  private syncing = false;
  private readonly listeners = new Set<SyncStatusCallback>();
  private readonly progressListeners = new Set<SyncProgressCallback>();
  private progress: SyncProgress = { active: false, completed: 0, total: 0 };
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupListeners();
  }

  /**
   * Start polling the backend on an interval so the app stays current without
   * anyone pressing "Sync". Each tick re-checks connectivity (which flushes
   * offline work on the offline→online edge) and, while online and signed in,
   * pushes any unsynced orders/expenses and pulls the latest order states — so a
   * change made elsewhere (e.g. a web cashier cancelling an order) lands here on
   * its own. The realtime socket handles the instant path; this is the safety
   * net that guarantees eventual convergence and offline catch-up. Idempotent.
   */
  startAutoSync(intervalMs = 20_000): void {
    if (this.autoSyncTimer || typeof window === "undefined") return;
    this.autoSyncTimer = setInterval(() => {
      void this.autoSyncTick();
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  private async autoSyncTick(): Promise<void> {
    // Nothing to sync until someone is signed in (avoid 401 spam pre-login).
    if (!getSessionUser()) return;
    if (this.syncing) return;
    try {
      // sync() verifies connectivity first and self-guards when offline, so a
      // tick while disconnected is a cheap no-op (and keeps the online badge
      // fresh). The realtime socket carries the instant path; this guarantees
      // eventual convergence and flushes anything queued offline.
      await this.sync(RECONNECT_SYNC_TASKS, { silent: true });
    } catch (error) {
      console.warn("[sync] Auto-sync tick failed", error);
    }
  }

  subscribe(callback: SyncStatusCallback): () => void {
    this.listeners.add(callback);
    void this.emitStatusFor(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Subscribe to fine-grained progress of the running sync cycle (task counts).
   * Emits the current snapshot immediately on subscribe. Kept separate from
   * `subscribe` so the lightweight progress ticks never trigger the expensive
   * unsynced-count recompute that `subscribe` listeners receive.
   */
  subscribeProgress(callback: SyncProgressCallback): () => void {
    this.progressListeners.add(callback);
    try {
      callback(this.progress);
    } catch (error) {
      console.error("[sync] Progress listener error", error);
    }
    return () => {
      this.progressListeners.delete(callback);
    };
  }

  private emitProgress(): void {
    this.progressListeners.forEach((listener) => {
      try {
        listener(this.progress);
      } catch (error) {
        console.error("[sync] Progress listener error", error);
      }
    });
  }

  notifyListeners(): void {
    void this.emitStatus();
  }

  async getUnsyncedCount(): Promise<number> {
    const counts = await Promise.all(
      syncTasks
        .map((task) => task.countUnsynced?.())
        .map(async (counter) => {
          try {
            return (await counter) ?? 0;
          } catch (error) {
            console.error("[sync] Failed to count unsynced records", error);
            return 0;
          }
        }),
    );
    return counts.reduce((acc, value) => acc + value, 0);
  }

  isAppOnline(): boolean {
    return this.online;
  }

  isSyncingInProgress(): boolean {
    return this.syncing;
  }

  async sync(
    targetTasks?: readonly string[],
    opts?: { silent?: boolean },
  ): Promise<boolean> {
    // Claim the sync lock synchronously so rapid double-clicks can't both slip
    // through before the (awaited) connection check sets `syncing`.
    if (this.syncing) {
      // console.log('[sync] A sync cycle is already running.');
      return false;
    }
    this.syncing = true;
    this.notifyListeners();

    const results: SyncTaskResult[] = [];

    try {
      const online = await this.verifyConnection();
      if (!online) {
        console.warn("[sync] Cannot start sync while offline.");
        return false;
      }

      const tasksToRun = targetTasks
        ? syncTasks.filter((task) => targetTasks.includes(task.name))
        : syncTasks;

      this.progress = { active: true, completed: 0, total: tasksToRun.length };
      this.emitProgress();

      for (const task of tasksToRun) {
        this.progress = { ...this.progress, task: task.name };
        this.emitProgress();
        await this.runTask(task, results);
        this.progress = {
          ...this.progress,
          completed: this.progress.completed + 1,
        };
        this.emitProgress();
      }

      const pushed = results.reduce((sum, result) => sum + result.pushed, 0);
      if (pushed > 0 && !opts?.silent) {
        toast.success(`Synced ${pushed} change${pushed === 1 ? "" : "s"}.`, {
          id: "sync-success",
        });
      }

      return true;
    } catch (error) {
      console.error("[sync] Failed to complete sync cycle", error);
      if (!opts?.silent) toast.error("Sync failed. Please try again.");
      return false;
    } finally {
      this.syncing = false;
      this.progress = {
        active: false,
        completed: this.progress.total,
        total: this.progress.total,
      };
      this.emitProgress();
      this.notifyListeners();
    }
  }

  notifyOnlineState(online: boolean): void {
    if (typeof window !== "undefined") {
      (window as any).isSyncOnline = online;
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setOnline(false);
      return false;
    }

    try {
      const response = await api.health();
      const reachable =
        response?.status === 200 || response?.data?.status === "success";
      this.setOnline(reachable);
      return reachable;
    } catch (error) {
      console.warn("[sync] Health probe failed", error);
      this.setOnline(false);
      return false;
    }
  }

  private async runTask(
    task: SyncTask,
    results: SyncTaskResult[],
  ): Promise<void> {
    try {
      if (task.push) {
        const pushed = await task.push();
        results.push({ name: task.name, pushed });
      }
    } catch (error) {
      console.error(`[sync] Push task "${task.name}" failed`, error);
    }

    try {
      if (task.pull) {
        await task.pull();
      }
    } catch (error) {
      console.error(`[sync] Pull task "${task.name}" failed`, error);
    }
  }

  private setupListeners(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => this.setOnline(true));
    window.addEventListener("offline", () => this.setOnline(false));
  }

  private setOnline(next: boolean): void {
    if (this.online === next) return;
    this.online = next;
    if (next) {
      toast.success("You are back online.", { id: "sync-online" });
      // Flush offline-created orders as soon as connectivity returns so they
      // can never be stranded locally. Fire-and-forget; sync() self-guards
      // against overlapping runs and re-verifies the connection.
      void this.sync(RECONNECT_SYNC_TASKS).catch((error) =>
        console.warn("[sync] Reconnect order flush failed", error),
      );
    } else {
      toast.error("You are offline. Sync is paused.", { id: "sync-offline" });
    }
    this.notifyOnlineState(next);
    this.notifyListeners();
  }

  private async emitStatus(): Promise<void> {
    const unsyncedCount = await this.getUnsyncedCount();
    const snapshot = {
      online: this.online,
      syncing: this.syncing,
      unsyncedCount,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("[sync] Listener error", error);
      }
    });
  }

  private async emitStatusFor(listener: SyncStatusCallback): Promise<void> {
    const unsyncedCount = await this.getUnsyncedCount();
    try {
      listener({ online: this.online, syncing: this.syncing, unsyncedCount });
    } catch (error) {
      console.error("[sync] Listener error", error);
    }
  }
}

export const syncEngine = new SimpleSyncEngine();
export default syncEngine;
