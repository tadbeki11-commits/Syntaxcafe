import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { tablesAdapter } from '@/infrastructure/adapters/tables.adapter';
import { TableFacade } from '@/application/tables/table.facade';

export const registerTableModule = (container: Container): void => {
  container.registerSingleton(TOKENS.tableFacade, new TableFacade(tablesAdapter));
};
