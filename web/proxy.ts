import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js "proxy" (formerly middleware — renamed in Next 16) guards both
// portals, each by its own session cookie:
//   - platform admins / owners → pa_token → /dashboard
//   - café waiters             → wp_token → /waiter
//
// The important bit for mobile: a waiter who opens a fresh tab lands on "/",
// which redirects toward the platform dashboard. Without the wp_token check
// below they'd be bounced to the owner login and rejected with "this portal is
// for platform admins and business owners". Instead we send a signed-in waiter
// straight back to their own portal so their session "persists" across tabs.

// Reads `role` out of the pa_token JWT payload without verifying the signature —
// the backend remains the real authority; here we only need the role to pick a
// redirect target. Edge-runtime safe (no Buffer): base64url-decode the middle
// segment with atob.
function roleFromToken(token?: string): string | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded))?.role ?? null;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const paToken = req.cookies.get("pa_token")?.value;
  const wpToken = req.cookies.get("wp_token")?.value;
  const { pathname } = req.nextUrl;

  const redirectTo = (path: string) => {
    const url = req.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url);
  };

  // A signed-in waiter should never see the platform login/dashboard. Send them
  // home; the waiter layout re-checks device enrollment + session from there.
  if (
    !paToken &&
    wpToken &&
    (pathname === "/" ||
      pathname === "/login" ||
      pathname === "/branch" ||
      pathname.startsWith("/dashboard"))
  ) {
    return redirectTo("/waiter");
  }

  // Platform admin / owner guard.
  if (pathname.startsWith("/dashboard") && !paToken) {
    return redirectTo("/login");
  }

  if ((pathname === "/login" || pathname === "/") && paToken) {
    // Send each user to THEIR landing, not a blanket /dashboard/overview.
    // /dashboard/overview is platform-only (it calls /platform/overview), so
    // forcing an owner/operator there — exactly what a mobile cold-resume hitting
    // "/" did — produced a 403 "Platform administrator access required". Only
    // super admins get the platform overview; everyone else lands on the
    // always-allowed /dashboard/home and the client gate fine-tunes from there.
    const role = roleFromToken(paToken);
    return redirectTo(
      role === "super_admin" ? "/dashboard/overview" : "/dashboard/home",
    );
  }

  // A signed-in operator who revisits the branch login goes straight to their
  // dashboard (branch admins land on /home; the page itself sends F&B managers
  // to /fb on fresh login).
  if (pathname === "/branch" && paToken) {
    return redirectTo("/dashboard/home");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/branch"],
};
