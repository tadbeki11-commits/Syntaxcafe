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

export async function apiFetch<T = any>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const branchId = getBranchId();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      // The backend gates several routes on this client marker.
      "X-App-Client": "tauri-pos-app",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(branchId ? { "X-Branch-Id": branchId } : {}),
      ...(opts.headers || {}),
    },
  });

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
