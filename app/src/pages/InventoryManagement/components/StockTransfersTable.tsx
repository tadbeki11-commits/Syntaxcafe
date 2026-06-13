import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NormalizedInventoryItem, StockTransfer } from '../types';

interface StockTransfersTableProps {
  transfers: StockTransfer[];
  items: NormalizedInventoryItem[];
  showAll?: boolean;
  onReceive?: (transfer: StockTransfer) => void;
  onPrintReceipts?: (transfer: StockTransfer) => void;
}

export const StockTransfersTable: React.FC<StockTransfersTableProps> = ({ transfers, items, showAll = false, onReceive, onPrintReceipts }) => {
  const itemById = new Map<string, NormalizedInventoryItem>();
  items.forEach((item) => {
    itemById.set(String(item.id), item);
    const remoteId = String((item as any).remote_id ?? "").trim();
    if (remoteId) itemById.set(remoteId, item);
  });
  const visibleTransfers = showAll ? (transfers || []) : (transfers || []).slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{showAll ? 'Stock Transfer History' : 'Recent Transfers'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleTransfers.length > 0 ? visibleTransfers.map(transfer => (
          <div key={transfer.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium capitalize">
                  {(transfer.from_location_name || transfer.from_location || '—')}
                  {' → '}
                  {(transfer.to_location_name || transfer.to_location || '—')}
                </div>
                <span className="text-xs text-muted-foreground">
                  {transfer.created_at ? new Date(transfer.created_at).toLocaleString() : 'Local transfer'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {(transfer.items || []).map(line => {
                  const item = itemById.get(String(line.inventory_item_id));
                  return `${item?.name || 'Item'}: ${line.quantity}`;
                }).join(', ') || 'No line items'}
              </div>
              {transfer.notes && (
                <div className="text-xs text-muted-foreground">Note: {transfer.notes}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={transfer.status === 'received' ? 'success' : 'secondary'} className="w-fit">
                {transfer.status}
              </Badge>
              {onReceive && transfer.status !== 'received' && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onReceive(transfer)}>
                  Receive
                </Button>
              )}
              {onPrintReceipts && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onPrintReceipts(transfer)}>
                  Receipts
                </Button>
              )}
            </div>
          </div>
        )) : (
          <p className="text-sm text-muted-foreground">No stock transfers yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StockTransfersTable;
