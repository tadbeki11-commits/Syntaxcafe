import React from 'react';
import { Coffee } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/common/EmptyState';
import { AggregatedItemRow } from '../types';

interface ItemsTableProps {
  ordersCount: number;
  paidCount: number;
  itemsRows: AggregatedItemRow[];
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  ordersCount,
  paidCount,
  itemsRows
}) => {
  return (
    <Card>
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Aggregated Items List</CardTitle>
          <CardDescription>Matches {itemsRows.length} distinct item types</CardDescription>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Orders: {ordersCount} · Settled: {paidCount}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Unit</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Quantity Sold</TableHead>
              <TableHead className="text-right">Accumulated Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <EmptyState
                    icon={<Coffee />}
                    title="No items found"
                    description="No items found matching the selected filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              itemsRows.map((r, idx) => (
                <TableRow key={`${r.unit}-${r.item}-${idx}`}>
                  <TableCell className="capitalize text-xs text-muted-foreground font-semibold">
                    {r.unit}
                  </TableCell>
                  <TableCell className="font-semibold text-sm text-foreground">
                    {r.item}
                  </TableCell>
                  <TableCell className="font-bold text-sm">
                    {r.qtySold}
                  </TableCell>
                  <TableCell className="text-right font-extrabold text-success">
                    {Number(r.revenue || 0).toLocaleString()} Birr
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ItemsTable;
