"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { birr, shortDate } from "@/lib/format";

type Payment = { id: string; amount: string | number; payment_date: string; notes?: string | null };
type Transaction = {
  id: string;
  payment_id: string | null;
  transaction_date: string;
  total_amount: string | number;
  notes?: string | null;
  services?: { description: string; cost: number }[];
};

export function PaymentList({
  payments,
  transactions,
}: {
  payments: Payment[];
  transactions: Transaction[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          No payments recorded.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => {
        const linked = transactions.filter((t) => t.payment_id === payment.id);
        const deducted = linked.reduce((s, t) => s + Number(t.total_amount), 0);
        const remaining = Number(payment.amount) - deducted;
        const isOpen = expanded === payment.id;

        return (
          <Collapsible
            key={payment.id}
            open={isOpen}
            onOpenChange={() => setExpanded(isOpen ? null : payment.id)}>
            <CollapsibleTrigger asChild>
              <button className="bg-card hover:bg-muted/50 w-full rounded-lg border px-4 py-3 text-left transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {birr(payment.amount)}
                      </span>
                      <Badge variant={remaining > 0 ? "default" : "secondary"}>
                        {remaining > 0 ? `${birr(remaining)} remaining` : "Fully used"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {shortDate(payment.payment_date)}
                      {payment.notes ? ` · ${payment.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {linked.length > 0 && (
                      <Badge variant="outline">
                        {linked.length} txn{linked.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {isOpen ? (
                      <ChevronUpIcon className="text-muted-foreground size-4" />
                    ) : (
                      <ChevronDownIcon className="text-muted-foreground size-4" />
                    )}
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="bg-muted/30 rounded-b-lg border border-t-0 px-4 py-3">
              {linked.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">
                  No transactions linked to this payment.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linked.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-muted-foreground">
                          {shortDate(t.transaction_date)}
                          {t.notes ? ` · ${t.notes}` : ""}
                        </TableCell>
                        <TableCell>
                          {(Array.isArray(t.services) ? t.services : [])
                            .map((s) => s.description)
                            .join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-rose-600 dark:text-rose-400">
                          -{birr(t.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
