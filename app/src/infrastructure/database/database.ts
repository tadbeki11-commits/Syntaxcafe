import { getLocalDb, type LocalDbDrizzle } from '@/db/client';

/**
 * Singleton database access — swap implementation here (SQLite today, PGlite later).
 */
export class Database {
  private static instance: LocalDbDrizzle | null = null;

  static async init(): Promise<LocalDbDrizzle> {
    if (!this.instance) {
      this.instance = await getLocalDb();
    }
    return this.instance;
  }

  static async get(): Promise<LocalDbDrizzle> {
    return this.init();
  }
}
