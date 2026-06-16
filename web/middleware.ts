import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Guards both portals, each by its own session cookie:
//   - platform admins / owners → pa_token → /dashboard
//   - café waiters             → wp_token → /waiter
//
// The important bit for mobile: a waiter who opens a fresh tab lands on "/",
// which redirects toward the platform dashboard. Without the wp_token check
// below they'd be bounced to the owner login and rejected with "this portal is
// for platform admins and business owners". Instead we send a signed-in waiter
// straight back to their own portal so their session "persists" across tabs.
export function middleware(req: NextRequest) {
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
      pathname.startsWith("/dashboard"))
  ) {
    return redirectTo("/waiter");
  }

  // Platform admin / owner guard.
  if (pathname.startsWith("/dashboard") && !paToken) {
    return redirectTo("/login");
  }

  if ((pathname === "/login" || pathname === "/") && paToken) {
    return redirectTo("/dashboard/overview");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login"],
};
