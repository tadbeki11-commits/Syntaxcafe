"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { getUser } from "@/lib/auth";
import {
  can,
  fetchMyPermissions,
  isAllAccessRole,
  landingRoute,
  resourceForPath,
} from "@/lib/permissions";

// Client-side route guard for the dashboard. Refreshes the cached permission
// matrix on mount (so owner edits take effect on next navigation) and blocks
// direct-URL access to a page the current role can't read, redirecting to the
// role's landing page. Pages with no mapped resource (home, overview, fb,
// profile) are always allowed. The backend guard is the real enforcement; this
// is for UX so users don't land on pages that would 403.
export function PermissionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Keep the cache fresh once per mount.
  useEffect(() => {
    let active = true;
    if (isAllAccessRole(getUser()?.role)) {
      setReady(true);
      return;
    }
    fetchMyPermissions().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const role = getUser()?.role;
    if (isAllAccessRole(role)) return;
    const resource = resourceForPath(pathname);
    if (resource && !can(resource, "read")) {
      toast.error("You don't have access to that page.");
      router.replace(landingRoute(role));
    }
  }, [ready, pathname, router]);

  return <>{children}</>;
}
