import React from "react";
import type { Metadata } from "next";
import { WaiterAuthProvider } from "@/components/waiter/auth-context";

// Advertise a waiter-scoped manifest for pages under /waiter so that installing
// from the waiter portal produces a separate app that launches straight into
// /waiter (distinct `id`/`start_url`/`scope`), instead of the root system app.
// Nested-route metadata overrides the root manifest link (see app/manifest.ts).
export const metadata: Metadata = {
  manifest: "/waiter.webmanifest",
};

// Root of the waiter portal. The `waiter-scope` class swaps in the warm cafe
// palette (see globals.css) so this section feels like the in-store POS without
// touching the neutral platform-admin theme. Auth state for waiters lives in its
// own provider, separate from the platform-admin session.
export default function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="waiter-scope min-h-screen bg-background text-foreground">
      <WaiterAuthProvider>{children}</WaiterAuthProvider>
    </div>
  );
}
