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

// The two sign-in tiers share the /auth/login endpoint and the same pa_token
// session, but live behind separate login pages so each stays focused: owners &
// platform admins on /login, branch operators (who must enroll a device first)
// on /branch. The role gate below is what keeps the wrong tier out of each page.
const OWNER_PORTAL_ROLES = ["super_admin", "owner", "business_admin"];
const OPERATOR_PORTAL_ROLES = ["admin", "fb_manager"];

// Token lives in a JS-readable cookie so middleware can guard routes and the API
// client can attach it. This is a back-office tool; if you later need stronger
// protection, move to an httpOnly cookie set by a Next route handler.
async function authenticate(
  username: string,
  password: string,
  allowedRoles: string[],
  rejectionMessage: string,
): Promise<SessionUser> {
  const data = await apiFetch<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const token = data?.token?.access_token;
  if (!token) throw new Error("Login failed: no token returned");

  if (!allowedRoles.includes(data.user?.role)) {
    throw new Error(rejectionMessage);
  }

  setCookie("pa_token", token, SESSION_MAX_AGE);
  localStorage.setItem("pa_user", JSON.stringify(data.user));
  return data.user;
}

// Owner / platform sign-in (/login).
export function login(username: string, password: string): Promise<SessionUser> {
  return authenticate(
    username,
    password,
    OWNER_PORTAL_ROLES,
    "This sign-in is for platform admins and business owners. Branch admins and F&B managers should use the branch sign-in.",
  );
}

// Branch-operator sign-in (/branch) for branch admins and F&B managers, used
// after the device has been enrolled to a branch.
export function operatorLogin(
  username: string,
  password: string,
): Promise<SessionUser> {
  return authenticate(
    username,
    password,
    OPERATOR_PORTAL_ROLES,
    "This sign-in is for branch admins and F&B managers. Owners and platform admins should use the main sign-in.",
  );
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
  fb_manager: "F&B Manager",
  admin: "Administrator",
  cashier: "Cashier",
  kitchen_staff: "Kitchen Staff",
  cafe_waiter: "Waiter",
};

export function roleLabel(role?: string): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}
