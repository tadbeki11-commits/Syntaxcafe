"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Clipboard, CheckCircle, Coffee, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/waiter/StatsCard";
import { useWaiterAuth } from "@/components/waiter/auth-context";
import { useWaiterData } from "@/components/waiter/dashboard/useWaiterData";
import { useWaiterStats } from "@/components/waiter/dashboard/useWaiterStats";
import HeaderBanner from "@/components/waiter/dashboard/HeaderBanner";
import QuickActions from "@/components/waiter/dashboard/QuickActions";
import RecentOrdersPanel from "@/components/waiter/dashboard/RecentOrdersPanel";

export default function WaiterDashboardPage() {
  const { user, logout } = useWaiterAuth();
  const router = useRouter();
  const [statsRange, setStatsRange] = useState("today");

  const { loading, dashboardData, attendanceStatus } = useWaiterData(user?.id);
  const { rangeOrders, stats } = useWaiterStats(
    dashboardData.myOrders,
    statsRange,
  );

  // Attendance has no backend module in the web deployment; surface a friendly
  // note rather than failing silently.
  const handleAttendanceUnavailable = () =>
    toast.message("Attendance / clock-in is handled in-store, not in the web portal.");

  const handleLogout = () => {
    logout();
    router.push("/waiter/login");
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Orders",
      value: stats.ordersCreated,
      icon: <Clipboard className="w-5 h-5" />,
      variant: "info" as const,
    },
    {
      title: "Orders Served",
      value: stats.ordersServed,
      icon: <CheckCircle className="w-5 h-5" />,
      variant: "success" as const,
    },
    {
      title: "Revenue",
      value: `${stats.totalRevenue.toLocaleString()} Birr`,
      icon: <Coffee className="w-5 h-5" />,
      variant: "default" as const,
    },
    {
      title: "Pending Balance",
      value: `${(Number(stats.pendingBalance) || 0).toLocaleString()} Birr`,
      icon: <DollarSign className="w-5 h-5" />,
      variant: "warning" as const,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <HeaderBanner
        userName={user?.full_name}
        attendanceStatus={attendanceStatus}
        onClockIn={handleAttendanceUnavailable}
        onClockOut={handleAttendanceUnavailable}
        onLogout={handleLogout}
      />

      <QuickActions
        onNewOrder={() => router.push("/waiter/create-order")}
        onOrderHistory={() => router.push("/waiter/order-history")}
        onViewMenu={() => router.push("/waiter/create-order")}
        onMyProfile={() =>
          toast.message("Your profile is managed by your administrator.")
        }
      />

      <div className="flex justify-center">
        <div className="flex bg-muted/50 p-1 rounded-xl border">
          {[
            { key: "today", label: "Today" },
            { key: "yesterday", label: "Yesterday" },
            { key: "week", label: "Week" },
            { key: "month", label: "Month" },
            { key: "all", label: "All" },
          ].map((opt) => (
            <Button
              key={opt.key}
              variant={statsRange === opt.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatsRange(opt.key)}
              className="h-8 text-xs font-bold px-3 sm:px-4"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <StatsCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            variant={card.variant}
          />
        ))}
      </div>

      <RecentOrdersPanel orders={rangeOrders} />
    </div>
  );
}
