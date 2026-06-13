import type { SyncableFields } from '@/shared/types/sync.types';

export abstract class Entity<TProps> {
  protected readonly props: TProps;
  protected readonly syncMeta: SyncableFields;

  protected constructor(props: TProps, syncMeta: SyncableFields) {
    this.props = props;
    this.syncMeta = syncMeta;
  }

  get version(): number {
    return this.syncMeta.version;
  }

  get createdAt(): string {
    return this.syncMeta.createdAt;
  }

  get updatedAt(): string {
    return this.syncMeta.updatedAt;
  }

  get deletedAt(): string | null {
    return this.syncMeta.deletedAt;
  }

  get isDeleted(): boolean {
    return this.syncMeta.deletedAt != null;
  }

  toJSON(): TProps & SyncableFields {
    return { ...this.props, ...this.syncMeta };
  }
}
