// @ts-nocheck
import { menuAdapter } from '@/infrastructure/adapters/menu.adapter';

type MenuAdapter = typeof menuAdapter;

export class MenuFacade {
  constructor(
    private readonly adapter: MenuAdapter,
  ) {}

  getAll = (params?: unknown, forceSync?: boolean) =>
    this.adapter.getAll(params, forceSync);
  getById = (id: number | string, forceSync?: boolean) =>
    this.adapter.getById(id, forceSync);
  getBakeryMenu = () => this.adapter.getBakeryMenu();
  getCafeMenu = (forceSync?: boolean) => this.adapter.getCafeMenu(forceSync);
  syncBulk = (payload: unknown) => this.adapter.syncBulk(payload);
  getCategories = (params?: unknown, forceSync?: boolean) =>
    this.adapter.getCategories(params, forceSync);
  getMainCategories = (params?: unknown) => this.adapter.getMainCategories(params);
  createMainCategory = (data: { name: string }) =>
    this.adapter.createMainCategory(data);

  create = async (menuData: Record<string, unknown>) => {
    return this.adapter.create(menuData);
  };

  update = async (id: number | string, menuData: Record<string, unknown>) => {
    return this.adapter.update(id, menuData);
  };

  delete = async (id: number | string) => {
    return this.adapter.delete(id);
  };

  toggleAvailability = async (id: number | string) => {
    return this.adapter.toggleAvailability(id);
  };
}
