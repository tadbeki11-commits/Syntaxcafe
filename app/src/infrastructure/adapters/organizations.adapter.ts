// @ts-nocheck
import { api } from "@/infrastructure/api/http-client";

export const organizationsAdapter = {
  /** List organizations — fetch directly from backend. */
  getAll: async (includeInactive = false) => {
    const response = await api.get("/organizations", {
      params: { include_inactive: includeInactive ? "true" : undefined },
    });
    return response;
  },

  /** Get single organization — fetch directly from backend. */
  getById: async (id: number | string) => {
    const response = await api.get(`/organizations/${id}`);
    return response;
  },

  /** Get orders for an organization — fetch directly from backend. */
  getOrders: async (id: number | string) => {
    const response = await api.get(`/organizations/${id}/orders`);
    return response;
  },

  create: async (input: {
    name: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    is_active?: boolean;
  }) => {
    const response = await api.post("/organizations", input);
    return response;
  },

  update: async (id: number | string, input: Record<string, unknown>) => {
    const response = await api.put(`/organizations/${id}`, input);
    return response;
  },

  /** Soft-delete (deactivate). */
  deactivate: async (id: number | string) => {
    const response = await api.delete(`/organizations/${id}`);
    return response;
  },

  // ─── Credit System ───────────────────────────────────────────────────────

  getCreditSummary: async (id: number | string) => {
    const response = await api.get(`/organizations/${id}/credit`);
    return response;
  },

  addPayment: async (
    id: number | string,
    input: { amount: number; payment_date?: string; notes?: string },
  ) => {
    const response = await api.post(`/organizations/${id}/payments`, input);
    return response;
  },

  getPayments: async (id: number | string) => {
    const response = await api.get(`/organizations/${id}/payments`);
    return response;
  },

  addTransaction: async (
    id: number | string,
    input: {
      payment_id?: string;
      transaction_date?: string;
      notes?: string;
      services: Array<{ description: string; cost: number }>;
    },
  ) => {
    const response = await api.post(
      `/organizations/${id}/transactions`,
      input,
    );
    return response;
  },

  getTransactions: async (id: number | string, page: number = 1, limit: number = 20) => {
    const response = await api.get(`/organizations/${id}/transactions`, {
      params: { page, limit },
    });
    return response;
  },
};

export default organizationsAdapter;
