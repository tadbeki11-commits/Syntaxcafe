import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Guard the dashboard behind a session cookie; bounce logged-in users off /login.
export function middleware(req: NextRequest) {
  const token = req.cookies.get("pa_token")?.value;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && token) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/overview";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
