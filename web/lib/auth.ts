import { apiFetch } from "./api";

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  full_name?: string;
};

// Token lives in a JS-readable cookie so middleware can guard routes and the API
// client can attach it. This is a back-office tool; if you later need stronger
// protection, move to an httpOnly cookie set by a Next route handler.
export async function login(
  username: string,
  password: string,
): Promise<SessionUser> {
  const data = await apiFetch<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const token = data?.token?.access_token;
  if (!token) throw new Error("Login failed: no token returned");

  if (!["super_admin", "owner", "business_admin"].includes(data.user?.role)) {
    throw new Error("This portal is for platform admins and business owners.");
  }

  document.cookie = `pa_token=${encodeURIComponent(token)}; path=/; max-age=${8 * 3600}; samesite=lax`;
  localStorage.setItem("pa_user", JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  document.cookie = "pa_token=; path=/; max-age=0";
  localStorage.removeItem("pa_user");
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("pa_user") || "null");
  } catch {
    return null;
  }
}
