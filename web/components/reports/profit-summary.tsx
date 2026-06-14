import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { StatCard } from "@/components/stat-card";
import { birr } from "@/lib/format";
import {
  computeProfit,
  monthRange,
  todayRange,
  type ProfitResult,
} from "@/lib/profit";

function ProfitGroup({ label, result }: { label: string; result: ProfitResult }) {
  const positive = result.profit >= 0;
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Sales (paid)"
          value={birr(result.sales)}
          subtitle="Paid order revenue"
          icon={<TrendingUp className="size-5" />}
          variant="info"
        />
        <StatCard
          title="Expenses"
          value={birr(result.expenses)}
          subtitle="Recorded expenses"
          icon={<TrendingDown className="size-5" />}
          variant="warning"
        />
        <StatCard
          title="Profit"
          value={birr(result.profit)}
          subtitle="Sales − expenses"
          icon={<Wallet className="size-5" />}
          variant={positive ? "success" : "destructive"}
        />
      </div>
    </div>
  );
}

// Daily/monthly profit (paid revenue − expenses). When `from`/`to` are given,
// a "Selected range" group is added on top of Today / This Month.
export function ProfitSummary({
  orders,
  payments,
  expenses,
  from,
  to,
  className,
}: {
  orders: any[];
  payments: any[];
  expenses: any[];
  from?: string;
  to?: string;
  className?: string;
}) {
  const today = todayRange();
  const month = monthRange();
  const hasRange = !!(from || to);

  return (
    <div className={className}>
      <div className="space-y-6">
        {hasRange && (
          <ProfitGroup
            label="Selected range"
            result={computeProfit(orders, payments, expenses, from ?? "", to ?? "")}
          />
        )}
        <ProfitGroup
          label="Today"
          result={computeProfit(orders, payments, expenses, today.from, today.to)}
        />
        <ProfitGroup
          label="This month"
          result={computeProfit(orders, payments, expenses, month.from, month.to)}
        />
      </div>
    </div>
  );
}
