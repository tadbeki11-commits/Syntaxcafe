import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  className?: string;
}

const VARIANT_STYLES: Record<string, { icon: string; value: string }> = {
  default: { icon: "bg-primary/10 text-primary", value: "text-foreground" },
  success: { icon: "bg-success/10 text-success", value: "text-success" },
  warning: { icon: "bg-warning/10 text-warning", value: "text-warning" },
  destructive: {
    icon: "bg-destructive/10 text-destructive",
    value: "text-destructive",
  },
  info: { icon: "bg-info/10 text-info", value: "text-info" },
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  variant = "default",
  className,
}) => {
  const styles = VARIANT_STYLES[variant];
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className={cn("text-lg font-black mt-1", styles.value)}>{value}</p>
          </div>
          {icon ? (
            <div className={cn("p-2.5 rounded-2xl shrink-0", styles.icon)}>
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
