import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { menuAdapter } from '@/infrastructure/adapters/menu.adapter';
import { MenuFacade } from '@/application/menu/menu.facade';

export const registerMenuModule = (container: Container): void => {
  container.registerSingleton(TOKENS.menuFacade, new MenuFacade(menuAdapter));
};
