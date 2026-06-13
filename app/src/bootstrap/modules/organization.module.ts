import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { organizationsAdapter } from '@/infrastructure/adapters/organizations.adapter';
import { OrganizationFacade } from '@/application/organization/organization.facade';

export const registerOrganizationModule = (container: Container): void => {
  container.registerSingleton(
    TOKENS.organizationFacade,
    new OrganizationFacade(organizationsAdapter),
  );
};
