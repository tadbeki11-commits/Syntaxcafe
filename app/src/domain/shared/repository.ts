export interface Repository<T> {
  findById(id: number): Promise<T | null>;
  findByLocalId(localId: string): Promise<T | null>;
  findAll(includeInactive?: boolean): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: number): Promise<void>;
}
