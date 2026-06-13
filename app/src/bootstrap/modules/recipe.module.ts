import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { recipesAdapter } from '@/infrastructure/adapters/recipes.adapter';
import { RecipeFacade } from '@/application/recipes/recipe.facade';

export const registerRecipeModule = (container: Container): void => {
  container.registerSingleton(TOKENS.recipeFacade, new RecipeFacade(recipesAdapter));
};
