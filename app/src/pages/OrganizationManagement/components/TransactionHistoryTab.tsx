import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBirr } from '../utils';
import { TransactionHistoryData } from '../types';

interface TransactionHistoryTabProps {
  orgs: any[];
  historyOrgId: string;
  setHistoryOrgId: (val: string) => void;
  historyPage: number;
  setHistoryPage: (val: number) => void;
  historyLimit: number;
  historyLoading: boolean;
  historyData: TransactionHistoryData | null;
}

export const TransactionHistoryTab = ({
  orgs,
  historyOrgId,
  setHistoryOrgId,
  historyPage,
  setHistoryPage,
  historyLimit,
  historyLoading,
  historyData,
}: TransactionHistoryTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Transaction History</CardTitle>
        <CardDescription>View all service transactions with backend pagination.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Organization *</Label>
          <Select value={historyOrgId} onValueChange={(val) => { setHistoryOrgId(val); setHistoryPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
            <SelectContent>
              {orgs.filter(o => o.is_active !== false && o.is_active !== 0).map(o => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {historyOrgId && (
          <>
            {historyLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !historyData ? (
              <div className="text-center py-8 text-muted-foreground">No data available.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Linked Payment</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    ) : historyData.transactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{new Date(txn.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {Array.isArray(txn.services) && txn.services.map((s, i) => (
                            <div key={i} className="text-sm">
                              {s.description} ({formatBirr(s.cost)})
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="font-semibold text-rose-600 dark:text-rose-400">
                          -{formatBirr(txn.total_amount)}
                        </TableCell>
                        <TableCell>
                          {txn.payment_id ? (
                            <Badge variant="secondary">Payment #{txn.payment_id}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Unlinked</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {txn.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {historyData.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {historyData.page} of {historyData.totalPages} ({historyData.count} total)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(Math.max(1, historyData.page - 1))}
                        disabled={historyData.page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(Math.min(historyData.totalPages, historyData.page + 1))}
                        disabled={historyData.page === historyData.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
