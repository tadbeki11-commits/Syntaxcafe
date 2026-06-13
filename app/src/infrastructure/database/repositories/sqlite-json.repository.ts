// @ts-nocheck
import type { JsonEntity, JsonRecord } from '@/domain/shared/json-entity';
import { JsonEntity as EntityFactory } from '@/domain/shared/json-entity';
import type { JsonRepository } from '@/domain/shared/json-repository';
import {
  deleteById,
  findByIdOrRemote,
  readRows,
  upsertRow,
} from '@/infrastructure/database/local-db-query';

export class SqliteJsonRepository<T extends JsonRecord>
  implements JsonRepository<T>
{
  constructor(private readonly table: unknown) {}

  async findById(id: number): Promise<JsonEntity<T> | null> {
    const row = await findByIdOrRemote(this.table as any, id);
    return row ? EntityFactory.fromRow<T>(row as T) : null;
  }

  async findByLocalId(localId: string): Promise<JsonEntity<T> | null> {
    const rows = await readRows(this.table as any);
    const row = rows.find((r: T) => r.localId === localId);
    return row ? EntityFactory.fromRow<T>(row) : null;
  }

  async findAll(): Promise<JsonEntity<T>[]> {
    const rows = await readRows(this.table as any);
    return rows.map((row) => EntityFactory.fromRow<T>(row as T));
  }

  async save(entity: JsonEntity<T>): Promise<number> {
    const record = entity.toRecord();
    return upsertRow(this.table as any, record);
  }

  async delete(id: number): Promise<void> {
    await deleteById(this.table as any, id);
  }
}
