import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PaymentMethodsBreakdown({
  paymentMethods,
}: {
  paymentMethods: Record<string, number>;
}) {
  const maxCount = Math.max(...(Object.values(paymentMethods) as number[]), 1);
  const entries = Object.entries(paymentMethods);

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Payment Channel Breakdown</CardTitle>
        <CardDescription>Method shares for paid orders</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
          {entries.length > 0 ? (
            entries.map(([method, count]) => (
              <div key={method} className="flex items-center justify-between font-semibold">
                <div className="flex items-center gap-2">
                  <div className="bg-primary size-2.5 rounded-full" />
                  <span className="text-foreground max-w-[120px] truncate text-xs font-extrabold capitalize">
                    {method.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs font-bold">
                    {count} transaction{count !== 1 ? "s" : ""}
                  </span>
                  <div className="bg-muted h-2 w-24 rounded-full">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground py-12 text-center text-xs font-bold">
              No transactions settled in the selected window.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
