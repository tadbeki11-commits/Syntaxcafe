// @ts-nocheck
import { usersAdapter } from '@/infrastructure/adapters/users.adapter';

type UsersAdapter = typeof usersAdapter;

export class UserFacade {
  private readonly adapter: UsersAdapter;

  constructor(adapter: UsersAdapter) {
    this.adapter = adapter;
  }

  getAll = (params?: unknown) => this.adapter.getAll(params);
  getById = (id: number | string) => this.adapter.getById(id);
  syncBulk = (payload: unknown) => this.adapter.syncBulk(payload);
  getByRole = (role: string) => this.adapter.getByRole(role);
  getEmployees = () => this.adapter.getEmployees();
  getWaiters = () => this.adapter.getWaiters();
  getKitchenStaff = () => this.adapter.getKitchenStaff();
  getCashiers = () => this.adapter.getCashiers();

  create = async (userData: Record<string, unknown>) => {
    const result = await this.adapter.create(userData);
    const user = (result as any)?.data?.data?.user ?? (result as any)?.data?.user;
    return result;
  };

  update = async (id: number | string, userData: Record<string, unknown>) => {
    const result = await this.adapter.update(id, userData);
    return result;
  };

  delete = async (id: number | string) => {
    const result = await this.adapter.delete(id);
    return result;
  };

  toggleStatus = (id: number | string) => this.adapter.toggleStatus(id);
}
