// @ts-nocheck
import { organizationsAdapter } from "@/infrastructure/adapters/organizations.adapter";

type OrganizationsAdapter = typeof organizationsAdapter;

export class OrganizationFacade {
  constructor(private readonly adapter: OrganizationsAdapter) {}

  getAll = (includeInactive = false) => this.adapter.getAll(includeInactive);
  getById = (id: number | string) => this.adapter.getById(id);
  getOrders = (id: number | string) => this.adapter.getOrders(id);
  create = (data: unknown) => this.adapter.create(data as any);
  update = (id: number | string, data: unknown) =>
    this.adapter.update(id, data as any);
  deactivate = (id: number | string) => this.adapter.deactivate(id);

  // Credit system
  getCreditSummary = (id: number | string) =>
    this.adapter.getCreditSummary(id);
  addPayment = (id: number | string, input: any) =>
    this.adapter.addPayment(id, input);
  getPayments = (id: number | string) => this.adapter.getPayments(id);
  addTransaction = (id: number | string, input: any) =>
    this.adapter.addTransaction(id, input);
  getTransactions = (id: number | string, page?: number, limit?: number) =>
    this.adapter.getTransactions(id, page, limit);
}
