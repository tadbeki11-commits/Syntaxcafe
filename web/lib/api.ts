// Thin client for the NestJS backend. The super-admin app is online-only and
// talks to the same API the desktop app syncs against.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getToken(): string | null {
  return readCookie("pa_token");
}

// The branch the owner has selected via the branch switcher. Sent as x-branch-id
// so the backend scopes every request to that branch.
export function getBranchId(): string | null {
  return readCookie("pa_branch");
}

export function setBranchId(id: string) {
  document.cookie = `pa_branch=${encodeURIComponent(id)}; path=/; max-age=${30 * 24 * 3600}; samesite=lax`;
}

// The enrolled device token, read straight from localStorage to avoid a circular
// import with lib/device.ts (which owns enrollment and imports API_BASE here).
// Keep the storage key in sync with lib/device.ts.
function getDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("pa_device") || "null")?.token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = any>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const branchId = getBranchId();
  // Branch admins enroll this device (see lib/device.ts); the device token pins
  // every request — including the unauthenticated /auth/login — to the enrolled
  // branch, so login can resolve a branch-scoped admin by username. Owners /
  // platform admins never enroll, so this header is simply absent for them.
  const deviceToken = getDeviceToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      // The backend gates several routes on this client marker.
      "X-App-Client": "tauri-pos-app",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(branchId ? { "X-Branch-Id": branchId } : {}),
      ...(deviceToken ? { "x-device-token": deviceToken } : {}),
      ...(opts.headers || {}),
    },
  });

  // An expired/invalid session comes back as 401. The pa_token cookie can outlive
  // the 8h JWT, so the app may look "signed in" while every call is rejected.
  // Only act when we actually sent a token (so a wrong-password 401 on a login
  // page, which carries no token, still surfaces its error normally). Clear the
  // stale cookie and bounce to login instead of leaking a raw error to the UI.
  if (res.status === 401 && token && typeof window !== "undefined") {
    document.cookie = "pa_token=; path=/; max-age=0";
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message || message;
      if (Array.isArray(message)) message = message.join(", ");
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
