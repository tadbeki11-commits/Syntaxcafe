import { api } from '@/infrastructure/api/http-client';

export type ConnectivityListener = (online: boolean) => void;

export class ConnectivityMonitor {
  private online =
    typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners = new Set<ConnectivityListener>();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private readonly heartbeatMs: number;

  constructor(heartbeatMs = 15_000) {
    this.heartbeatMs = heartbeatMs;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline(true));
      window.addEventListener('offline', () => this.setOnline(false));
    }
    this.startHeartbeat();
  }

  isOnline(): boolean {
    return this.online;
  }

  subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    listener(this.online);
    return () => this.listeners.delete(listener);
  }

  private setOnline(value: boolean) {
    if (this.online === value) return;
    this.online = value;
    if (typeof window !== 'undefined') {
      (window as any).isSyncOnline = value;
    }
    this.listeners.forEach((l) => l(value));
  }

  private async probe(): Promise<boolean> {
    try {
      await api.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private startHeartbeat() {
    this.intervalId = setInterval(async () => {
      const reachable = await this.probe();
      this.setOnline(reachable);
    }, this.heartbeatMs);
  }

  dispose() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
