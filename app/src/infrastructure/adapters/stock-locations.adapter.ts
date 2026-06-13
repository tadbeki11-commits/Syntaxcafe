import { api, isOnline } from "@/infrastructure/api/http-client";

const requireOnline = () =>
  isOnline()
    ? null
    : Promise.reject(
        new Error("Stock location management requires an internet connection"),
      );

export const stockLocationsAdapter = {
  getAll: async (includeInactive = false) => {
    return api.get("/stock-locations", {
      params: { include_inactive: includeInactive ? "true" : "false" },
    });
  },

  getById: async (id: number | string) => {
    return api.get(`/stock-locations/${id}`);
  },

  create: async (payload: Record<string, unknown>) => {
    const offline = requireOnline();
    if (offline) return offline;
    return api.post("/stock-locations", payload);
  },

  update: async (id: number | string, payload: Record<string, unknown>) => {
    const offline = requireOnline();
    if (offline) return offline;
    return api.put(`/stock-locations/${id}`, payload);
  },

  deactivate: async (id: number | string) => {
    const offline = requireOnline();
    if (offline) return offline;
    return api.delete(`/stock-locations/${id}`);
  },

  cacheLocations: async (locations: unknown[]) => locations,
};
