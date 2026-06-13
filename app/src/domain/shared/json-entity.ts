import { Entity } from '@/domain/shared/entity';
import { createSyncMeta, bumpVersion, markDeleted } from '@/domain/shared/sync-metadata';
import type { SyncableFields } from '@/shared/types/sync.types';
import { generateLocalId } from '@/shared/utils/id';
import { getApproximateServerIsoString } from '@/shared/utils/serverTime';

export type JsonRecord = Record<string, unknown> & {
  id?: number | null;
  localId?: string;
  remote_id?: number | null;
  synced?: 0 | 1;
};

export class JsonEntity<T extends JsonRecord> extends Entity<T> {
  protected constructor(props: T, syncMeta: SyncableFields) {
    super(props, syncMeta);
  }

  static create<T extends JsonRecord>(
    props: Omit<T, 'id' | 'localId' | 'synced'>,
    localId = generateLocalId(),
  ): JsonEntity<T> {
    return new JsonEntity(
      { ...props, id: null, localId, remote_id: null, synced: 0 } as T,
      createSyncMeta(),
    );
  }

  static fromRow<T extends JsonRecord>(row: T): JsonEntity<T> {
    return new JsonEntity(row, createSyncMeta({
      version: Number(row.version ?? 1),
      createdAt: String(row.created_at ?? row.createdAt ?? getApproximateServerIsoString()),
      updatedAt: String(row.updated_at ?? row.updatedAt ?? getApproximateServerIsoString()),
      deletedAt: (row.deleted_at as string | null) ?? null,
    }));
  }

  get id(): number | null {
    return (this.props.id as number | null) ?? null;
  }

  get localId(): string {
    return String(this.props.localId ?? '');
  }

  get synced(): 0 | 1 {
    return Number(this.props.synced ?? 0) as 0 | 1;
  }

  markSynced(remoteId: number): JsonEntity<T> {
    return new JsonEntity(
      { ...this.props, id: this.props.id ?? remoteId, remote_id: remoteId, synced: 1 } as T,
      bumpVersion(this.syncMeta),
    );
  }

  touchUnsynced(patch: Partial<T>): JsonEntity<T> {
    return new JsonEntity(
      { ...this.props, ...patch, synced: 0 } as T,
      bumpVersion(this.syncMeta),
    );
  }

  softDelete(): JsonEntity<T> {
    return new JsonEntity(
      { ...this.props, synced: 0 } as T,
      markDeleted(this.syncMeta),
    );
  }

  toRecord(): T & SyncableFields {
    return { ...this.props, ...this.syncMeta };
  }

  toPayload(): Record<string, unknown> {
    return { ...this.props, version: this.syncMeta.version };
  }
}
