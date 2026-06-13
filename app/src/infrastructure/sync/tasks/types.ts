export type SyncTask = {
  /** Human-readable identifier used for logging and status reporting */
  name: string;
  /**
   * Push local changes for this task.
   * Should return the number of records that were marked as synced (for status reporting).
   */
  push?: () => Promise<number>;
  /** Pull remote changes and refresh the local cache for this task. */
  pull?: () => Promise<void>;
  /** Optional counter used when estimating pending work. */
  countUnsynced?: () => Promise<number>;
};

export type SyncTaskResult = {
  name: string;
  pushed: number;
};
