import React from "react";
import { CashierAuthProvider } from "@/components/cashier/auth-context";

// Root of the cashier portal. Reuses the warm `waiter-scope` cafe palette (see
// globals.css) so the floor-facing portal feels like the in-store POS rather
// than the neutral platform-admin theme. Cashier auth lives in its own provider,
// separate from both the platform-admin session and the waiter session.
export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="waiter-scope min-h-screen bg-background text-foreground">
      <CashierAuthProvider>{children}</CashierAuthProvider>
    </div>
  );
}
