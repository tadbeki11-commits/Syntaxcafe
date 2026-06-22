import { localDbTables } from "@/db/localDb";
import { api, isOnline } from "@/infrastructure/api/http-client";
import {
  deleteById,
  findByIdOrRemote,
  readRows,
  upsertRow,
} from "@/infrastructure/database/local-db-query";

const readUsers = async () => {
  return readRows(localDbTables.users);
};

const findUser = async (id: string) => {
  return findByIdOrRemote(localDbTables.users, id);
};


// Concurrency lock to prevent parallel getAll calls from racing
let _getAllLock: Promise<any> | null = null;

const upsertUser = async (user: any) => {
  return upsertRow(localDbTables.users, user);
};


export const usersAdapter = {
  getAll: async (params?: any) => {
    // Serialize concurrent calls to prevent race conditions
    if (_getAllLock) {
      return _getAllLock;
    }
    const doGetAll = async () => {
      // 1. If online, fetch fresh data from backend
      if (isOnline()) {
        try {
          const response = await api.get("/users", { params });
          const remoteUsers =
            response.data?.data?.users ?? response.data?.users ?? [];

          if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
            const localUsers = remoteUsers.map((u: any) => {
              return {
                id: u.id,
                username: u.username,
                role: u.role,
                is_active: u.is_active !== false ? 1 : 0,
                pin: u.pin || "",
                passcode: u.password_hash,
                cancel_password: u.cancel_password ?? null,
                synced: 1,
                full_name: u.full_name,
                first_name: u.first_name ,
                last_name: u.last_name,
                phone: u.phone,
              };
            });

            console.log("[Users Sync] Upserting", localUsers.length, "users");
            for (const user of localUsers) {
              try {
                await upsertUser(user);
              } catch (upsertErr) {
                console.error("Failed to upsert user:", user, upsertErr);
                throw upsertErr;
              }
            }

            return {
              data: { status: "success", data: { users: localUsers } },
              status: 200,
              statusText: "OK",
              headers: {},
              config: {} as any,
            };
          }
        } catch (err) {
          console.error(
            "Error fetching users online, falling back to localDb:",
            err,
          );
        }
      }

      // 2. Offline fallback: retrieve cached users from local DB
      const cachedUsers = await readUsers();
      return {
        data: { status: "success", data: { users: cachedUsers } },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      };
    }; // end doGetAll

    _getAllLock = doGetAll();
    try {
      return await _getAllLock;
    } finally {
      _getAllLock = null;
    }
  },
  getById: async (id: string) => {
    const user = await findUser(id);
    if (user) {
      return {
        data: { status: "success", data: user },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      };
    }
    return {
      data: { status: "error", message: "User not found locally" },
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: {} as any,
    } as any;
  },
  syncBulk: (payload: any) => api.post("/users/sync", payload),
  create: async (userData: any) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("User creation is only allowed when online"),
      );
    }
    const response = await api.post("/users", userData);
    return response;
  },
  update: async (id: string, userData: any) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("User management requires an internet connection"),
      );
    }

    const response = await api.put(`/users/${id}`, userData);
    return response;
  },
  delete: async (id: string) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("User management requires an internet connection"),
      );
    }

    const response = await api.delete(`/users/${id}`);
    return response;
  },
  toggleStatus: async (id: string) => {
    if (!isOnline()) {
      return Promise.reject(
        new Error("User management requires an internet connection"),
      );
    }

    const response = await api.patch(`/users/${id}/toggle-status`);
    return response;
  },
  getByRole: async (role: string) => {
    const resp = await usersAdapter.getAll();
    const usersList = resp.data?.data?.users ?? [];
    const filtered = usersList.filter((u: any) => u.role === role);
    return {
      data: { status: "success", data: { users: filtered } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getEmployees: async () => {
    return usersAdapter.getAll();
  },
  getWaiters: async () => {
    const resp = await usersAdapter.getAll();
    const usersList = resp.data?.data?.users ?? [];
    const filtered = usersList.filter(
      (u: any) => u.role === "cafe_waiter" || u.role === "waiter",
    );
    return {
      data: { status: "success", data: { users: filtered } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
  getCashiers: async () => {
    const resp = await usersAdapter.getAll();
    const usersList = resp.data?.data?.users ?? [];
    const filtered = usersList.filter((u: any) => u.role === "cashier");
    return {
      data: { status: "success", data: { users: filtered } },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };
  },
};
