import type { SyncableFields } from '@/shared/types/sync.types';
import { getApproximateServerIsoString } from '@/shared/utils/serverTime';

export const nowIso = (): string => getApproximateServerIsoString();

export const createSyncMeta = (
  partial?: Partial<SyncableFields>,
): SyncableFields => {
  const now = nowIso();
  return {
    version: partial?.version ?? 1,
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
    deletedAt: partial?.deletedAt ?? null,
  };
};

export const bumpVersion = (meta: SyncableFields): SyncableFields => ({
  ...meta,
  version: meta.version + 1,
  updatedAt: nowIso(),
});

export const markDeleted = (meta: SyncableFields): SyncableFields => ({
  ...bumpVersion(meta),
  deletedAt: nowIso(),
});
