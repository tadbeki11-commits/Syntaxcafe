// @ts-nocheck
import { generateLocalId, localDbTables } from "@/db/localDb";
import { api, notImplemented, isOnline } from "@/infrastructure/api/http-client";
import {
  deleteById,
  findByIdOrRemote,
  readRows,
  upsertRow,
} from "@/infrastructure/database/local-db-query";

export const tablesAdapter = {
  getAll: async () => {
    if (isOnline()) {
      try {
        const response = await api.get("/tables");
        const tablesList =
          response?.data?.data?.tables ?? response?.data?.tables ?? [];
        const remoteTables: any[] = Array.isArray(tablesList) ? tablesList : [];
        const mappedTables = remoteTables.map((t: any) => ({
          id: t.id,
          number: t.table_number ?? t.number,
          capacity: t.capacity,
          status: t.status,
        }));
        return {
          data: { status: "success", data: { tables: mappedTables } },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as any,
        };
      } catch (err) {
        console.warn("[tables] Online fetch failed, falling back to local cache", err);
      }
    }

    const tables = await readRows(localDbTables.diningTables);
    const mappedTables = tables.map((t) => ({
      id: t.id,
      number: t.table_number,
      status: t.status,
    }));

    return {
      data: { status: "success", data: { tables: mappedTables } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getStatus: () => notImplemented("Tables"),
  create: async (tableData: any) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Table management requires an internet connection"),
      );
    }

    const response = await api.post("/tables", {
      table_number: tableData.table_number || tableData.number,
      status: tableData.status || "available",
      capacity: tableData.capacity,
    });
    return response;
  },
  delete: async (id: any) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("Table management requires an internet connection"),
      );
    }

    const table = await findByIdOrRemote(localDbTables.diningTables, id);

    const response = await api.delete(`/tables/${id}`);
    return response;
  },
  releaseAll: () => notImplemented("Tables"),
};
