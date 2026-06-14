import React from "react";
import { WaiterAuthProvider } from "@/components/waiter/auth-context";

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
