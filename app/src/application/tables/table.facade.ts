// @ts-nocheck
import { tablesAdapter } from '@/infrastructure/adapters/tables.adapter';
import { notImplemented } from '@/infrastructure/api/http-client';

type TablesAdapter = typeof tablesAdapter;

export class TableFacade {
  constructor(
    private readonly adapter: TablesAdapter,
  ) {}

  getAll = () => this.adapter.getAll();
  getStatus = () => notImplemented('Tables');
  releaseAll = () => notImplemented('Tables');

  create = async (tableData: Record<string, unknown>) => {
    return this.adapter.create(tableData);
  };

  delete = async (id: unknown) => {
    return this.adapter.delete(id);
  };
}
