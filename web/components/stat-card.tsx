import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "info" | "warning" | "destructive";

const accent: Record<Variant, string> = {
  default: "text-foreground",
  success: "text-green-600 dark:text-green-400",
  info: "text-blue-600 dark:text-blue-400",
  warning: "text-amber-600 dark:text-amber-400",
  destructive: "text-destructive",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-xs font-medium">{title}</p>
          <p className="truncate text-2xl font-semibold">{value}</p>
          {subtitle && <p className="text-muted-foreground truncate text-xs">{subtitle}</p>}
        </div>
        {icon && <div className={cn("shrink-0", accent[variant])}>{icon}</div>}
      </CardContent>
    </Card>
  );
}
