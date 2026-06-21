import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type StatCard = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  valueClass?: string;
};

// Shared summary cards used across dashboard pages (Dashboard, Orders,
// Payments). Mirrors the card style on the home dashboard.
export function StatCards({
  cards,
  loading,
  className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
}: {
  cards: StatCard[];
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.label}
            </CardTitle>
            <c.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className={`text-2xl font-semibold ${c.valueClass ?? ""}`}>
                  {c.value}
                </div>
                {c.hint && <p className="text-muted-foreground text-xs">{c.hint}</p>}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
