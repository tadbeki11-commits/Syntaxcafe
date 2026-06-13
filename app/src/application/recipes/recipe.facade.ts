// @ts-nocheck
import { recipesAdapter } from '@/infrastructure/adapters/recipes.adapter';

type RecipesAdapter = typeof recipesAdapter;

export class RecipeFacade {
  constructor(
    private readonly adapter: RecipesAdapter,
  ) {}

  getAll = (menuItemId?: number) => this.adapter.getAll(menuItemId);
  getByMenuItemId = (menuItemId: number) => this.adapter.getByMenuItemId(menuItemId);
  cacheRecipe = (recipe: unknown) => this.adapter.cacheRecipe(recipe);
  readCachedRecipes = () => this.adapter.readCachedRecipes();

  create = async (payload: Record<string, unknown>) => {
    return this.adapter.create(payload as any);
  };

  update = async (id: string, payload: Record<string, unknown>) => {
    return this.adapter.update(id, payload as any);
  };

  delete = async (id: string) => {
    return this.adapter.delete(id);
  };
}
