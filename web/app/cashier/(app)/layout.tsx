"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/waiter/LoadingSpinner";
import { useCashierAuth } from "@/components/cashier/auth-context";
import { isDeviceEnrolled } from "@/lib/cashier/device";

// Gate for the authenticated cashier screens. A device must first be enrolled to
// a branch (token in localStorage); then a cashier must be signed in. Anything
// missing bounces to the right screen.
export default function CashierAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, isAuthenticated } = useCashierAuth();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isDeviceEnrolled()) {
      router.replace("/cashier/enroll");
      return;
    }
    if (!isAuthenticated) {
      router.replace("/cashier/login");
      return;
    }
    setAllowed(true);
    setReady(true);
  }, [loading, isAuthenticated, router]);

  if (loading || !ready || !allowed) {
    return <LoadingSpinner text="Loading…" />;
  }

  return <>{children}</>;
}
