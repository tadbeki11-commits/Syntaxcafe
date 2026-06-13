export type SyncEventStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export type SyncEntityType =
  | 'stock_location'
  | 'menu_item'
  | 'inventory_item'
  | 'order'
  | 'payment'
  | 'user'
  | 'recipe'
  | 'table'
  | 'role'
  | 'payment_method'
  | 'attendance'
  | 'category';

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncEventRecord {
  id: number;
  eventType: string;
  entityType: SyncEntityType;
  entityId: number | null;
  entityLocalId: string | null;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  status: SyncEventStatus;
  createdAt: string;
}

export interface RemoteSyncChange {
  id: number;
  eventType: string;
  entityType: string;
  entityId: number | null;
  entityLocalId: string | null;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  version: number;
  createdAt: string;
}

export interface SyncChangesResponse {
  events: RemoteSyncChange[];
  nextCursor: number;
  hasMore: boolean;
}

export interface SyncableFields {
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
