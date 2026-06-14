import { BarChart2, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { birr } from "@/lib/format";
import type { ReportData } from "@/lib/reports";

export function ReportsStats({ reportData }: { reportData: ReportData }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Today's Orders"
        value={reportData.dailyStats.totalOrders}
        subtitle={`Cafe: ${reportData.dailyStats.cafeOrders} | Rest: ${reportData.dailyStats.restaurantOrders} | Bar: ${reportData.dailyStats.baristaOrders}`}
        icon={<BarChart2 className="size-5" />}
        variant="info"
      />
      <StatCard
        title="Today's Revenue"
        value={birr(reportData.dailyStats.paidRevenue || 0)}
        subtitle="Paid settlement orders only"
        icon={<DollarSign className="size-5" />}
        variant="success"
      />
      <StatCard
        title="Weekly Orders"
        value={reportData.weeklyStats.totalOrders}
        subtitle={`Avg paid: ${birr(reportData.weeklyStats.avgPaidOrderValue || 0)}`}
        icon={<TrendingUp className="size-5" />}
        variant="default"
      />
      <StatCard
        title="Monthly Growth"
        value={`${(reportData.monthlyStats.growth || 0) >= 0 ? "+" : ""}${(reportData.monthlyStats.growth || 0).toFixed(1)}%`}
        subtitle={`${birr(reportData.monthlyStats.paidRevenue || 0)} this month`}
        icon={<Calendar className="size-5" />}
        variant="warning"
      />
    </div>
  );
}
