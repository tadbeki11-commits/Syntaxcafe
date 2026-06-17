import { apiFetch } from "./api";

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  full_name?: string;
};

// Writes a persistent, cross-tab cookie. Mobile Safari/Chrome are strict about
// SameSite=Lax cookies set from JS over HTTPS: without `Secure` they may be
// dropped, which is why a fresh tab on a phone looked "logged out". Mirrors the
// attribute handling in components/active-theme.tsx.
function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? " Secure;"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax;${secure}`;
}

// Keep the back-office session around for a week so reopening the app / new tabs
// on mobile doesn't force a re-login mid-day.
const SESSION_MAX_AGE = 7 * 24 * 3600;

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

  setCookie("pa_token", token, SESSION_MAX_AGE);
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

// Persist edits to the signed-in user (e.g. after a profile update) so the
// sidebar and other reads reflect the change without a re-login.
export function setUser(user: SessionUser) {
  localStorage.setItem("pa_user", JSON.stringify(user));
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Platform Admin",
  owner: "Owner",
  business_admin: "Business Admin",
  admin: "Administrator",
  cashier: "Cashier",
  kitchen_staff: "Kitchen Staff",
  cafe_waiter: "Waiter",
};

export function roleLabel(role?: string): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}
