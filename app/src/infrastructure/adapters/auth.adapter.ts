import { AuthResponse, ApiResponse, User } from "@/types/api.types";
import { generateLocalId, localDbTables } from "@/db/localDb";
import { api, isOnline } from "@/infrastructure/api/http-client";
import { compare } from "bcryptjs";
import {
  findByIdOrRemote,
  readRows,
  upsertRow,
} from "@/infrastructure/database/local-db-query";
import {
  getApproximateServerIsoString,
  getApproximateServerNow,
} from "@/shared/utils/serverTime";

const readUsers = async () => {
  return readRows(localDbTables.users);
};

const findUserByIdOrRemote = async (id: string) => {
  return findByIdOrRemote(localDbTables.users, id);
};

const upsertUser = async (user: any) => {
  return upsertRow(localDbTables.users, {
    ...user,
  });
};

const isSecretMatch = async (
  input: string | undefined,
  storedSecret: string | undefined,
) => {
  if (!input || !storedSecret) return false;
  return compare(input, storedSecret);
};

const SENSITIVE_USER_KEYS = [
  "pin",
  "passcode",
  "password",
  "password_hash",
  "pin_hash",
  "cancel_password",
];

const sanitizeUser = (user: any) => {
  if (!user) return null;
  const sanitized = { ...user };
  for (const key of SENSITIVE_USER_KEYS) {
    delete sanitized[key];
  }
  return sanitized;
};

const makeSuccessResponse = (
  user: any,
  message: string,
  token?: string,
  serverTime?: string,
) => ({
  data: {
    status: "success",
    message,
    token: token || `local_auth_token_${getApproximateServerNow()}`,
    user,
    data: { user },
    ...(serverTime
      ? {
          server_time: serverTime,
        }
      : {}),
  },
  status: 200,
  statusText: "OK",
  headers: {},
  config: {} as any,
});

const findLocalUserByIdentity = async (identity: any) => {
  const allUsers = await readUsers();
  const loginIdentity = [
    identity?.username,
    identity?.full_name,
    identity?.name,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return allUsers.find(
    (u: any) =>
      u.id === identity?.id ||
      loginIdentity.includes(String(u.username || "").toLowerCase()) ||
      loginIdentity.includes(String(u.full_name || "").toLowerCase()) ||
      loginIdentity.includes(String(u.name || "").toLowerCase()),
  );
};

const getVerifiedLocalUser = async (identity: any) => {
  const localUser = await findLocalUserByIdentity(identity);
  return sanitizeUser(localUser || identity);
};

const authAdapterImpl = {
  login: async (credentials: any) => {
    const persistAndReturnVerifiedUser = async (
      userData: any,
      message: string,
      token?: string,
      serverTime?: string,
    ) => {
      try {
        const existingUser = await findLocalUserByIdentity(userData);

        if (existingUser?.id) {
          await upsertUser({
            ...userData,
            id: existingUser.id,
            pin: existingUser.pin || userData?.pin,
            passcode: existingUser.passcode || userData?.passcode,
            password_hash:
              (existingUser as any).password_hash || userData?.password_hash,
            synced: 1,
          });
        } else {
          await upsertUser({
            ...userData,
            pin: userData?.pin,
            passcode: userData?.passcode,
            password_hash: userData?.password_hash,
            synced: 1,
          } as any);
        }

        const verifiedUser = await getVerifiedLocalUser(userData);
        if (verifiedUser) {
          return makeSuccessResponse(verifiedUser, message, token, serverTime);
        }
      } catch {
        // Ignore localDb save/read errors and fall through to the original response.
      }

      return null;
    };

    // Try backend first if online
    if (isOnline()) {
      try {
        const response = await api.post<AuthResponse>(
          "/auth/login",
          credentials,
        );

        if (response.data?.user) {
          const userResponse = await persistAndReturnVerifiedUser(
            response.data.user,
            response.data?.message || "Logged in successfully",
            response.data?.token || (response.data as any)?.access_token,
            response.data?.server_time,
          );

          if (userResponse) return userResponse;
        }

        return response;
      } catch (error) {
        // Fall back to offline login if online request fails
        const pin = credentials.pin;
        if (pin) {
          return authAdapterImpl.pinLogin(credentials);
        }
      }
    }

    // Offline login
    const allUsers = await readUsers();
    const user = allUsers.find((u: any) => u.username === credentials.username);

    if (user && Boolean(user.is_active ?? true)) {
      const storedPassword = user.passcode;
      const passwordMatches = await isSecretMatch(
        credentials.password,
        storedPassword,
      );

      if (!passwordMatches) {
        return Promise.reject({
          response: {
            status: 401,
            data: { status: "error", message: "Invalid credentials" },
          },
        });
      }

      return makeSuccessResponse(
        sanitizeUser(user),
        "Logged in offline",
        "offline_token_" + getApproximateServerNow(),
        getApproximateServerIsoString(),
      ) as any;
    }

    return Promise.reject({
      response: {
        status: 401,
        data: { status: "error", message: "Invalid credentials" },
      },
    });
  },
  pinLogin: async (credentials: any) => {
    const { name, pin } = credentials;
    const allUsers = await readUsers();
    const user = allUsers.find(
      (u: any) =>
        u.username === name || u.full_name === name || u.name === name,
    );

    let found = null;
    if (user && Boolean(user.is_active ?? true)) {
      if (await isSecretMatch(pin, user.pin || user.passcode)) {
        found = sanitizeUser(user);
      }
    }

    if (found) {
      return makeSuccessResponse(
        found,
        "Logged in successfully",
        "local_auth_token",
        getApproximateServerIsoString(),
      ) as any;
    }
    return Promise.reject({
      response: {
        status: 401,
        data: { status: "error", message: "Invalid PIN" },
      },
    });
  },
  staffLogin: async (credentials: any) => {
    const { name, password } = credentials;
    const allUsers = await readUsers();
    const user = allUsers.find(
      (u: any) =>
        u.username === name || u.full_name === name || u.name === name,
    );
    let found = null;
    if (user && Boolean(user.is_active ?? true)) {
      const storedPassword = (user as any).password_hash || user.passcode;
      if (await isSecretMatch(password, storedPassword)) {
        found = sanitizeUser(user);
      }
    }

    if (found) {
      return makeSuccessResponse(
        found,
        "Logged in successfully",
        "local_auth_token",
      ) as any;
    }
    return Promise.reject({
      response: {
        status: 401,
        data: { status: "error", message: "Invalid Credentials" },
      },
    });
  },
  register: async (userData: any) => {
    // Try backend first if online
    if (isOnline()) {
      try {
        const response = await api.post<AuthResponse>(
          "/auth/register",
          userData,
        );
        // Save user to localDb on successful backend registration
        if (response.data?.user) {
          const user = response.data.user;

          try {
            await upsertUser({
              ...user,
              pin: (user as any).pin,
              passcode: (user as any).passcode,
              password_hash: (user as any).password_hash,
              synced: 1,
            } as any);
          } catch (dbError) {
            // Ignore localDb save errors, still return the backend response
          }
        }
        return response;
      } catch (error) {
        // If online request fails, reject and don't fall back to local registration
        throw error;
      }
    }

    // Offline registration - create locally with generated UUID
    const allUsers = await readUsers();
    const existingUser = allUsers.find(
      (u: any) => u.username === userData.username,
    );

    if (existingUser) {
      return Promise.reject({
        response: {
          status: 409,
          data: { status: "error", message: "User already exists" },
        },
      });
    }

    const userId = generateLocalId();
    const newUser = {
      ...userData,
      id: userId,
      synced: 0,
      is_active: 1,
    };

    await upsertUser(newUser as any);

    return {
      data: {
        status: "success",
        message: "User registered offline",
        token: "offline_token_" + getApproximateServerNow(),
        user: { id: userId, ...newUser },
      },
      status: 201,
      statusText: "Created",
      headers: {},
      config: {} as any,
    } as any;
  },
  logout: async () => {
    if (!isOnline()) {
      return {
        data: { status: "success" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      };
    }
    return api.post("/auth/logout");
  },
  getProfile: async (userId: string | number) => {
    // Try backend first if online
    if (isOnline()) {
      try {
        const response = await api.get<ApiResponse<{ user: User }>>(
          `/auth/profile/${userId}`,
        );
        // Save user to localDb on successful backend request
        if (response.data?.data?.user) {
          const user = response.data.data.user;

          try {
            // Check if user exists locally by id
            const allUsers = await readUsers();
            const existingUser = allUsers.find(
              (u: any) => u.id === user.id || u.id === String(userId),
            );

            if (existingUser && existingUser.id) {
              // Update existing user
              await upsertUser({
                ...existingUser,
                ...user,
                synced: 1,
              });
            } else {
              await upsertUser({
                ...user,
                synced: 1,
              } as any);
            }
          } catch (dbError) {
            // Ignore localDb save errors, still return the backend response
          }
        }
        return response;
      } catch (error) {
        // Fall back to localDb on error
      }
    }

    // Fall back to localDb when offline or on error
    const user = await findUserByIdOrRemote(String(userId));
    if (user) {
      return {
        data: { status: "success", data: { user } },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      } as any;
    }

    return Promise.reject({
      response: {
        status: 404,
        data: { status: "error", message: "User not found" },
      },
    });
  },
  updateProfile: async (userId: string | number, data: any) => {
    if (!isOnline()) {
      return Promise.reject({
        response: {
          status: 503,
          data: {
            status: "error",
            message:
              "Profile updates are disabled when the application is offline.",
          },
        },
      });
    }

    const response = await api.put<AuthResponse>(
      `/auth/profile/${userId}`,
      data,
    );
    // Update user in localDb with new data and mark as synced
    let user = await findUserByIdOrRemote(String(userId));

    if (user && user.id) {
      try {
        await upsertUser({
          ...user,
          ...data,
          synced: 1,
        });
      } catch (dbError) {
        // Ignore localDb save errors
      }
    }
    return response;
  },
  changePassword: async (userId: string | number, data: any) => {
    if (!isOnline()) {
      return Promise.reject({
        response: {
          status: 503,
          data: {
            status: "error",
            message:
              "Password/PIN changes are disabled when the application is offline.",
          },
        },
      });
    }

    const response = await api.post(`/users/${userId}/change-password`, data);
    // Update password in localDb and mark as synced
    let user = await findUserByIdOrRemote(String(userId));

    if (user && user.id) {
      try {
        await upsertUser({
          ...user,
          passcode: data.new_password || data.password,
          synced: 1,
        });
      } catch (dbError) {
        // Ignore localDb save errors
      }
    }
    return response;
  },
  getServerTime: async () => {
    if (!isOnline()) {
      return Promise.reject({
        response: {
          status: 503,
          data: {
            status: "error",
            message: "Cannot fetch server time while offline",
          },
        },
      });
    }
    return api.get("/auth/time");
  },
};

export const authAdapter = authAdapterImpl;
