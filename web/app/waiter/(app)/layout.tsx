"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/waiter/LoadingSpinner";
import { useWaiterAuth } from "@/components/waiter/auth-context";
import { isDeviceEnrolled } from "@/lib/waiter/device";

// Gate for the authenticated waiter screens. A device must first be enrolled to
// a branch (token in localStorage); then a waiter must be signed in. Anything
// missing bounces to the right screen.
export default function WaiterAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, isAuthenticated } = useWaiterAuth();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isDeviceEnrolled()) {
      router.replace("/waiter/enroll");
      return;
    }
    if (!isAuthenticated) {
      router.replace("/waiter/login");
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
