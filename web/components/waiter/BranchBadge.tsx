"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from "react";
import { getDeviceEnrollment } from "@/lib/waiter/device";

interface BranchBadgeProps {
  className?: string;
}

// Shows the enrolled device's label (set during enrollment) so floor staff can
// confirm which station/branch this device is bound to. Renders nothing until a
// label is available.
const BranchBadge: React.FC<BranchBadgeProps> = ({ className = "" }) => {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    const enrollment = getDeviceEnrollment();
    setLabel(enrollment?.deviceName?.trim() || "");
  }, []);

  if (!label) return null;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm ${className}`}
    >
      {label}
    </span>
  );
};

export default BranchBadge;
