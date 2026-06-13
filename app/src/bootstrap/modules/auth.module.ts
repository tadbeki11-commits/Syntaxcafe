import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { authAdapter } from '@/infrastructure/adapters/auth.adapter';
import { AuthFacade } from '@/application/auth/auth.facade';

export const registerAuthModule = (container: Container): void => {
  container.registerSingleton(TOKENS.authFacade, new AuthFacade(authAdapter));
};
