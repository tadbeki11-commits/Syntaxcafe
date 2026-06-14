"use client";

import { Card, CardContent } from "@/components/ui/card";
import { birr } from "@/lib/format";

export function CreditSummary({
  creditBalance,
  totalPaid,
  totalDeducted,
}: {
  creditBalance: number;
  totalPaid: number;
  totalDeducted: number;
}) {
  const stats = [
    {
      label: "Credit balance",
      value: creditBalance,
      tone:
        creditBalance < 0
          ? "text-destructive"
          : "text-emerald-600 dark:text-emerald-400",
    },
    { label: "Total paid", value: totalPaid, tone: "" },
    { label: "Total used", value: totalDeducted, tone: "" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {s.label}
            </p>
            <p className={`mt-1 text-2xl font-semibold ${s.tone}`}>{birr(s.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
