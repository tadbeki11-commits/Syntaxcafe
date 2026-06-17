"use client";

import Link from "next/link";
import {
  ChevronRightIcon,
  MonitorSmartphoneIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  UserIcon,
  WalletCardsIcon,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

type SettingLink = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const SECTIONS: SettingLink[] = [
  {
    title: "Profile",
    description: "Your name, username, and password.",
    href: "/dashboard/profile",
    icon: UserIcon,
  },
  {
    title: "Order Rules",
    description: "Per-branch POS behavior for the selected branch.",
    href: "/dashboard/settings/preferences",
    icon: SlidersHorizontalIcon,
  },
  {
    title: "Payment Methods",
    description: "The payment methods staff can settle orders with.",
    href: "/dashboard/settings/payment-methods",
    icon: WalletCardsIcon,
  },
  {
    title: "Roles",
    description: "Roles assigned to staff in this business.",
    href: "/dashboard/settings/roles",
    icon: ShieldIcon,
  },
  {
    title: "Devices",
    description: "Devices enrolled to this branch and their status.",
    href: "/dashboard/settings/devices",
    icon: MonitorSmartphoneIcon,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and how this business operates."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <s.icon className="size-5" />
                  </div>
                  <ChevronRightIcon className="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
                </div>
                <CardTitle className="pt-2 text-base">{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
