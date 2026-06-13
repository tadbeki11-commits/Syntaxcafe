"use client";

import { useEffect, useState } from "react";
import {
  Building2Icon,
  CheckCircle2Icon,
  StoreIcon,
  MonitorSmartphoneIcon,
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

type Overview = {
  businesses: number;
  active_businesses: number;
  branches: number;
  devices: number;
};

const cards = [
  { key: "businesses", label: "Businesses", icon: Building2Icon },
  { key: "active_businesses", label: "Active", icon: CheckCircle2Icon },
  { key: "branches", label: "Branches", icon: StoreIcon },
  { key: "devices", label: "Enrolled Devices", icon: MonitorSmartphoneIcon },
] as const;

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
        {cards.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-semibold">{data?.[key] ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
