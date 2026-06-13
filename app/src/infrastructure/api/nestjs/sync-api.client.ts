import { api } from '@/infrastructure/api/http-client';
import type { SyncChangesResponse } from '@/shared/types/sync.types';

export class SyncApiClient {
  async fetchChanges(
    since: number,
    limit = 500,
  ): Promise<SyncChangesResponse> {
    const response = await api.get<SyncChangesResponse>('/sync/changes', {
      params: { since, limit },
    });
    return response.data;
  }

  async pushEvents(
    events: Array<{
      eventType: string;
      entityType: string;
      entityId: number | null;
      entityLocalId: string | null;
      operation: string;
      payload: Record<string, unknown>;
      clientVersion?: number;
    }>,
  ): Promise<{ accepted: number; conflicts: number }> {
    const response = await api.post<{ accepted: number; conflicts: number }>(
      '/sync/events',
      { events },
    );
    return response.data;
  }
}
