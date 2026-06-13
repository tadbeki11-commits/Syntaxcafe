import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { usersAdapter } from '@/infrastructure/adapters/users.adapter';
import { UserFacade } from '@/application/users/user.facade';

export const registerUserModule = (container: Container): void => {
  const facade = new UserFacade(usersAdapter);
  container.registerSingleton(TOKENS.userFacade, facade);
};
