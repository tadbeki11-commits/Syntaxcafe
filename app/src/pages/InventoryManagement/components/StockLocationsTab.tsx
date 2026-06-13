import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  MapPin,
  ArrowRight,
  History,
  ShoppingCart,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Package2,
} from 'lucide-react';
import { NormalizedInventoryItem, StockLocation, StockTransfer, InventoryMovement } from '../types';
import api from '@/application';

interface StockLocationsTabProps {
  items: NormalizedInventoryItem[];
  stockLocations: StockLocation[];
  transfers: StockTransfer[];
  onReceive?: (transfer: StockTransfer) => void;
  onPrintReceipts?: (transfer: StockTransfer) => void;
  onRefresh?: () => void;
  transferPage: number;
  transferLimit: number;
  transferTotalCount: number;
  transferTotalPages: number;
  setTransferPage: (page: number) => void;
  setTransferLimit: (limit: number) => void;
}

/* ────────────────────────────────────────────────────────────
   Helper: stock quantity for an item at a given location id
──────────────────────────────────────────────────────────── */
function stockAt(item: NormalizedInventoryItem, locationId: number): number {
  const stockByLocation = (item as any).stock_by_location as any[];
  if (!Array.isArray(stockByLocation)) return 0;
  const entry = stockByLocation.find((s: any) => s.location_id === locationId);
  return entry ? Number(entry.quantity) : 0;
}

function minAt(item: NormalizedInventoryItem, locationId: number): number | null {
  const stockByLocation = (item as any).stock_by_location as any[];
  if (!Array.isArray(stockByLocation)) return null;
  const entry = stockByLocation.find((s: any) => s.location_id === locationId);
  return entry?.min_quantity != null ? Number(entry.min_quantity) : null;
}

/* ────────────────────────────────────────────────────────────
   Sub-component: Stock by Location grid
──────────────────────────────────────────────────────────── */
const StockByLocationGrid: React.FC<{
  items: NormalizedInventoryItem[];
  locations: StockLocation[];
}> = ({ items, locations }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return items;
    return items.filter(it => it.name.toLowerCase().includes(term));
  }, [items, search]);

  if (locations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="mx-auto h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">No stock locations configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items…"
          className="pl-9 h-9"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-48 font-semibold">Item</TableHead>
              <TableHead className="text-xs text-muted-foreground">Unit</TableHead>
              {locations.map(loc => (
                <TableHead key={loc.id} className="text-center min-w-[100px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-xs">{loc.name}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={locations.length + 3} className="text-center py-8 text-muted-foreground">
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(item => {
                const total = locations.reduce((sum, loc) => sum + stockAt(item, loc.id), 0);
                const globalMin = Number(item.min_quantity || 0);
                const isLow = globalMin > 0 && total < globalMin;

                return (
                  <TableRow key={item.id} className={isLow ? 'bg-destructive/5' : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        <span className="font-medium text-sm truncate max-w-[160px]">{item.name}</span>
                      </div>
                      {globalMin > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Min: {globalMin} {item.base_unit || 'pcs'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.base_unit || 'pcs'}</TableCell>
                    {locations.map(loc => {
                      const qty = stockAt(item, loc.id);
                      const locMin = minAt(item, loc.id);
                      const locLow = locMin != null && locMin > 0 && qty < locMin;
                      return (
                        <TableCell key={loc.id} className="text-center">
                          <span className={`inline-flex items-center justify-center font-semibold text-sm rounded px-1.5 py-0.5 min-w-[2.5rem] ${
                            locLow
                              ? 'bg-destructive/15 text-destructive'
                              : qty === 0
                              ? 'text-muted-foreground'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {qty}
                          </span>
                          {locMin != null && locMin > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">min {locMin}</div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <span className={`font-bold text-sm ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                        {total}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-primary/20" />
          In stock
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-destructive/20" />
          Below minimum
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          Low stock alert
        </span>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Sub-component: Transfer History
──────────────────────────────────────────────────────────── */
const TransferHistoryPanel: React.FC<{
  transfers: StockTransfer[];
  items: NormalizedInventoryItem[];
  onReceive?: (t: StockTransfer) => void;
  onPrintReceipts?: (t: StockTransfer) => void;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}> = ({ transfers, items, onReceive, onPrintReceipts, totalCount, page, pageSize, totalPages, onPageChange, onPageSizeChange }) => {
  const itemById = useMemo(() => {
    const map = new Map<number, NormalizedInventoryItem>();
    items.forEach(it => {
      map.set(Number(it.id), it);
      const remote = Number((it as any).remote_id);
      if (Number.isFinite(remote)) map.set(remote, it);
    });
    return map;
  }, [items]);

  if (transfers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="mx-auto h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">No stock transfers recorded yet.</p>
      </div>
    );
  }

  // Flatten transfer items for table display
  const tableRows = useMemo(() => {
    const rows: any[] = [];
    transfers.forEach(transfer => {
      const fromName = transfer.from_location_name || transfer.from_location || '—';
      const toName = transfer.to_location_name || transfer.to_location || '—';
      const lineItems = Array.isArray(transfer.items) ? transfer.items : [];
      
      if (lineItems.length === 0) {
        rows.push({
          transfer,
          fromName,
          toName,
          item: null,
          quantity: null,
          sourceQtyAfter: null,
          destQtyAfter: null,
        });
      } else {
        lineItems.forEach((line, idx) => {
          const lineItem = itemById.get(Number(line.inventory_item_id));
          rows.push({
            transfer,
            fromName,
            toName,
            item: lineItem,
            quantity: line.quantity,
            sourceQtyAfter: (line as any).source_quantity_after,
            destQtyAfter: (line as any).destination_quantity_after,
            isFirstItem: idx === 0,
            itemSpan: lineItems.length,
          });
        });
      }
    });
    return rows;
  }, [transfers, itemById]);

  const formatQuantity = (qty: number | null, item: NormalizedInventoryItem | null) => {
    if (qty == null || item == null) return '—';
    const piecesPerUnit = Number(item.pieces_per_unit) || 1;
    const baseQty = Number(qty);
    const purchaseQty = piecesPerUnit > 1 ? (baseQty / piecesPerUnit).toFixed(2) : baseQty;
    return `${baseQty} ${item.base_unit || 'pcs'} (${purchaseQty} ${item.unit || 'pcs'})`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">From → To</TableHead>
              <TableHead className="font-semibold">Item</TableHead>
              <TableHead className="font-semibold text-right">Transferred</TableHead>
              <TableHead className="font-semibold text-right">Source Qty After</TableHead>
              <TableHead className="font-semibold text-right">Dest Qty After</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.map((row, idx) => {
              const statusVariant = row.transfer.status === 'received' ? 'success' : row.transfer.status === 'cancelled' ? 'destructive' : 'secondary';
              const item = row.item;
              const piecesPerUnit = item ? Number(item.pieces_per_unit) || 1 : 1;
              const baseQty = row.quantity != null ? Number(row.quantity) : null;
              const purchaseQty = baseQty != null && piecesPerUnit > 1 ? (baseQty / piecesPerUnit).toFixed(2) : baseQty;
              
              return (
                <TableRow key={`${row.transfer.id}-${idx}`}>
                  {row.isFirstItem ? (
                    <TableCell rowSpan={row.itemSpan} className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.transfer.created_at ? new Date(row.transfer.created_at).toLocaleString() : 'Local'}
                    </TableCell>
                  ) : null}
                  {row.isFirstItem ? (
                    <TableCell rowSpan={row.itemSpan} className="text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{row.fromName}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{row.toName}</span>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell className="text-sm font-medium">
                    {item?.name ?? `Item #${row.transfer.items?.[0]?.inventory_item_id}`}
                  </TableCell>
                  <TableCell className="text-right">
                    {baseQty != null ? (
                      <div className="text-sm">
                        <span className="font-mono font-semibold">{baseQty} {item?.base_unit || 'pcs'}</span>
                        {piecesPerUnit > 1 && (
                          <div className="text-xs text-muted-foreground">({purchaseQty} {item?.unit || 'pcs'})</div>
                        )}
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(row.sourceQtyAfter, item)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(row.destQtyAfter, item)}
                  </TableCell>
                  {row.isFirstItem ? (
                    <TableCell rowSpan={row.itemSpan}>
                      <Badge variant={statusVariant as any} className="capitalize">{row.transfer.status}</Badge>
                    </TableCell>
                  ) : null}
                  {row.isFirstItem ? (
                    <TableCell rowSpan={row.itemSpan}>
                      <div className="flex items-center gap-1">
                        {onReceive && row.transfer.status !== 'received' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onReceive(row.transfer)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Receive
                          </Button>
                        )}
                        {onPrintReceipts && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onPrintReceipts(row.transfer)}>
                            Print
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} transfers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="h-8"
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="h-8"
            >
              Next
            </Button>
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Sub-component: Order Deduction History
──────────────────────────────────────────────────────────── */
const OrderDeductionPanel: React.FC<{
  items: NormalizedInventoryItem[];
}> = ({ items }) => {
  const [movements, setMovements] = useState<(InventoryMovement & { item_name: string; item: NormalizedInventoryItem })[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Auto-load deductions once items are available — no manual click needed.
  useEffect(() => {
    if (!fetched && !loading && items.length > 0) {
      loadMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const deductions: (InventoryMovement & { item_name: string; item: NormalizedInventoryItem })[] = [];
      let totalMovementsCount = 0;

      // Fetch movements for each item; filter for sale/order_deduction types
      await Promise.all(
        items.slice(0, 50).map(async item => {
          try {
            const response = await (api.inventory as any).getMovements?.(item.id, undefined, page, pageSize);
            const data = (response as any)?.data?.data ?? {};
            const rows = data.movements ?? [];
            totalMovementsCount += data.count ?? 0;
            
            const saleRows = (Array.isArray(rows) ? rows : []).filter(
              (m: any) => m.movement_type === 'sale' || m.movement_type === 'order_deduction',
            );
            saleRows.forEach((m: any) => {
              deductions.push({ ...m, item_name: item.name, item });
            });
          } catch {
            // skip item
          }
        }),
      );
      // Sort newest first
      deductions.sort((a, b) => {
        const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bT - aT;
      });
      setMovements(deductions);
      setTotalCount(totalMovementsCount);
      setTotalPages(Math.ceil(totalMovementsCount / pageSize));
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const formatQuantity = (qty: number | null, item: NormalizedInventoryItem | null) => {
    if (qty == null || item == null) return '—';
    const piecesPerUnit = Number(item.pieces_per_unit) || 1;
    const baseQty = Number(qty);
    const purchaseQty = piecesPerUnit > 1 ? (baseQty / piecesPerUnit).toFixed(2) : baseQty;
    return `${baseQty} ${item.base_unit || 'pcs'} (${purchaseQty} ${item.unit || 'pcs'})`;
  };

  if (loading || (!fetched && items.length > 0)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <RefreshCw className="mx-auto h-8 w-8 mb-2 animate-spin opacity-50" />
        <p className="text-sm">Loading order deductions…</p>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground space-y-2">
        <ShoppingCart className="mx-auto h-10 w-10 opacity-40" />
        <p className="text-sm">No order deductions recorded yet.</p>
        <Button variant="ghost" size="sm" onClick={loadMovements}>Refresh</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{totalCount} total deductions</p>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={loadMovements}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Date & Time</TableHead>
              <TableHead className="font-semibold">Inventory Item</TableHead>
              <TableHead className="font-semibold">Menu Item</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold text-right">Deducted (Base/Purchase)</TableHead>
              <TableHead className="font-semibold text-right">Remaining (Base/Purchase)</TableHead>
              <TableHead className="font-semibold">Order ID</TableHead>
              <TableHead className="font-semibold">By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((m, idx) => (
              <TableRow key={`${m.id}-${idx}`}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                </TableCell>
                <TableCell className="font-medium text-sm">{m.item_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.menu_item_name || '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.location_name || (m.location_id ? `#${m.location_id}` : '—')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">
                    <span className="inline-flex items-center justify-end font-mono text-destructive font-semibold">
                      {m.quantity_delta != null ? Math.abs(m.quantity_delta) : '—'}
                    </span>
                    {m.item && m.quantity_delta != null && (
                      <div className="text-xs text-muted-foreground">
                        {formatQuantity(m.quantity_delta, m.item)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">
                    <span className="inline-flex items-center justify-end font-mono text-foreground font-semibold">
                      {m.quantity_after ?? '—'}
                    </span>
                    {m.item && m.quantity_after != null && (
                      <div className="text-xs text-muted-foreground">
                        {formatQuantity(m.quantity_after, m.item)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.order_id ? `#${m.order_id}` : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {m.user_name ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages >= 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} deductions
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(p => Math.max(1, p - 1));
                loadMovements();
              }}
              disabled={page === 1}
              className="h-8"
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(p => Math.min(totalPages, p + 1));
                loadMovements();
              }}
              disabled={page === totalPages}
              className="h-8"
            >
              Next
            </Button>
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
              loadMovements();
            }}
            className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Main: StockLocationsTab
──────────────────────────────────────────────────────────── */
export const StockLocationsTab: React.FC<StockLocationsTabProps> = ({
  items,
  stockLocations,
  transfers,
  onReceive,
  onPrintReceipts,
  onRefresh,
  transferPage,
  transferLimit,
  transferTotalCount,
  transferTotalPages,
  setTransferPage,
  setTransferLimit,
}) => {
  const totalItems = items.length;
  const totalLocations = stockLocations.length;
  const pendingTransfers = transfers.filter(t => t.status !== 'received').length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Package2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Items Tracked</span>
            </div>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Locations</span>
            </div>
            <p className="text-2xl font-bold">{totalLocations}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <History className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Pending Transfers</span>
            </div>
            <p className="text-2xl font-bold">{pendingTransfers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Two sub-tabs */}
      <Tabs defaultValue="transfers" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="transfers" className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Transfer History
            {pendingTransfers > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{pendingTransfers}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="deductions" className="flex items-center gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" />
            Order Deductions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Transfer History</CardTitle>
              <span className="text-xs text-muted-foreground">{transferTotalCount} total</span>
            </CardHeader>
            <CardContent>
              <TransferHistoryPanel
                transfers={transfers}
                items={items}
                onReceive={onReceive}
                onPrintReceipts={onPrintReceipts}
                totalCount={transferTotalCount}
                page={transferPage}
                pageSize={transferLimit}
                totalPages={transferTotalPages}
                onPageChange={setTransferPage}
                onPageSizeChange={setTransferLimit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deductions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Deduction History</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Inventory quantities deducted when orders were fulfilled.
              </p>
            </CardHeader>
            <CardContent>
              <OrderDeductionPanel items={items} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StockLocationsTab;
