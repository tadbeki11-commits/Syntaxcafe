"use client";

import { useEffect, useState } from "react";
import {
  Building2Icon,
  CheckCircle2Icon,
  StoreIcon,
  MonitorSmartphoneIcon,
  UsersIcon,
  ReceiptTextIcon,
  BanknoteIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { birr } from "@/lib/format";

type Overview = {
  businesses: number;
  active_businesses: number;
  branches: number;
  devices: number;
  users: number;
  orders: number;
  revenue: number;
  orders_today: number;
  revenue_today: number;
};

type CardDef = {
  key: keyof Overview;
  label: string;
  icon: typeof Building2Icon;
  // Optional value formatter (defaults to the raw count) and sub-label.
  format?: (v: number) => string;
  sub?: (d: Overview) => string;
};

const cards: CardDef[] = [
  { key: "businesses", label: "Businesses", icon: Building2Icon },
  { key: "active_businesses", label: "Active", icon: CheckCircle2Icon },
  { key: "branches", label: "Branches", icon: StoreIcon },
  { key: "users", label: "Users", icon: UsersIcon },
  { key: "devices", label: "Enrolled Devices", icon: MonitorSmartphoneIcon },
  {
    key: "orders",
    label: "Total Orders",
    icon: ReceiptTextIcon,
    format: (v) => v.toLocaleString(),
    sub: (d) => `${d.orders_today.toLocaleString()} today`,
  },
  {
    key: "revenue",
    label: "Total Revenue",
    icon: BanknoteIcon,
    format: birr,
    sub: (d) => `${birr(d.revenue_today)} today`,
  },
];

export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Overview>("/platform/overview")
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground text-sm">
          Everything across every business you manage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, label, icon: Icon, format, sub }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-3xl font-semibold">
                    {format ? format(data[key]) : data[key]}
                  </div>
                  {sub && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {sub(data)}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
