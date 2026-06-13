import type { JsonEntity, JsonRecord } from '@/domain/shared/json-entity';

export interface JsonRepository<T extends JsonRecord> {
  findById(id: number): Promise<JsonEntity<T> | null>;
  findByLocalId(localId: string): Promise<JsonEntity<T> | null>;
  findAll(): Promise<JsonEntity<T>[]>;
  save(entity: JsonEntity<T>): Promise<number>;
  delete(id: number): Promise<void>;
}
