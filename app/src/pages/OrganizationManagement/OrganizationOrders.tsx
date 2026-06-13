import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/application';
import ConfirmCashPaymentModal from '@/pages/Dashboards/CashierDashboard/modals/ConfirmCashPaymentModal';
import { formatBirr, isOrderUnpaid, useOrgPayment } from './useOrgPayment';

interface OrganizationOrdersProps {
  /** Organizations already loaded by the parent (active + inactive for admin). */
  organizations: any[];
}

type PaymentFilter = 'active' | 'paid' | 'all';

/**
 * Consolidated view of orders across every organization. Lets an admin (or an
 * enabled cashier) see active organization orders, filter by organization,
 * status and payment, and confirm payment without drilling into each org.
 */
export const OrganizationOrders: React.FC<OrganizationOrdersProps> = ({
  organizations,
}) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('active');
  const [search, setSearch] = useState('');

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of organizations) {
      const id = String(org.id ?? org.remote_id ?? "").trim();
      if (id) map.set(id, org.name);
    }
    return map;
  }, [organizations]);

  const load = useCallback(async () => {
    if (!organizations.length) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Reuse the per-org adapter (handles online/offline merge) and tag each
      // order with its organization for the consolidated table.
      const results = await Promise.allSettled(
        organizations.map(async (org) => {
          const orgId = String(org.id ?? org.remote_id);
          const res = (await api.organizations.getOrders(orgId)) as any;
          const list = res?.data?.data?.orders ?? [];
          return (Array.isArray(list) ? list : []).map((o: any) => ({
            ...o,
            __orgId: orgId,
            __orgName: org.name,
          }));
        }),
      );

      const merged = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => (r as PromiseFulfilledResult<any[]>).value);

      merged.sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return tb - ta;
      });

      setOrders(merged);
    } catch (error) {
      console.error('[OrganizationOrders] load failed', error);
      toast.error('Failed to load organization orders');
    } finally {
      setLoading(false);
    }
  }, [organizations]);

  useEffect(() => {
    load();
  }, [load]);

  const payment = useOrgPayment(load);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      if (o.status) set.add(String(o.status));
    }
    return Array.from(set).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (orgFilter !== 'all' && String(o.__orgId) !== orgFilter) return false;
      if (statusFilter !== 'all' && String(o.status) !== statusFilter)
        return false;
      if (paymentFilter === 'active' && !isOrderUnpaid(o)) return false;
      if (paymentFilter === 'paid' && isOrderUnpaid(o)) return false;
      if (term) {
        const haystack = `${o.id ?? ''} ${o.localId ?? ''} ${
          o.__orgName ?? ''
        }`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [orders, orgFilter, statusFilter, paymentFilter, search]);

  const activeCount = useMemo(
    () => orders.filter(isOrderUnpaid).length,
    [orders],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Organization</label>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem
                    key={org.id ?? org.localId}
                    value={String(org.id ?? org.remote_id)}
                  >
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Payment</label>
            <Select
              value={paymentFilter}
              onValueChange={(v) => setPaymentFilter(v as PaymentFilter)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (unpaid)</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Order # or org"
                className="w-48 pl-8"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{activeCount} active</Badge>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No organization orders match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => {
                  const orderKey = `${order.__orgId}-${order.id ?? order.localId}`;
                  const numericId = String(order.id ?? order.localId);
                  return (
                    <TableRow key={orderKey}>
                      <TableCell className="font-medium">
                        <button
                          className="hover:underline"
                          onClick={() =>
                            navigate(
                              `/dashboard/organizations/${order.__orgId}`,
                            )
                          }
                        >
                          #{order.id ?? order.localId}
                        </button>
                      </TableCell>
                      <TableCell>{order.__orgName || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{order.status || '—'}</Badge>
                      </TableCell>
                      <TableCell>{order.payment_status || '—'}</TableCell>
                      <TableCell>
                        {formatBirr(order.total_amount)}
                        {(order.is_price_override === true ||
                          order.is_price_override === 1) && (
                          <Badge variant="outline" className="ml-2">
                            Custom price
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isOrderUnpaid(order) ? (
                          <Button
                            size="sm"
                            onClick={() => payment.openConfirmPayment(order)}
                            disabled={payment.processingOrderId === numericId}
                          >
                            {payment.processingOrderId === numericId
                              ? 'Processing...'
                              : 'Confirm Payment'}
                          </Button>
                        ) : (
                          <Badge variant="secondary">Paid</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmCashPaymentModal
        open={payment.showConfirmModal}
        onOpenChange={payment.closeModal}
        confirmProcessPaymentOrder={payment.confirmOrder}
        isBlockingPaymentUi={payment.processingOrderId != null}
        isProcessing={payment.processingOrderId != null}
        paymentMethod={payment.paymentMethod}
        setPaymentMethod={payment.setPaymentMethod}
        onConfirm={payment.handleConfirmPayment}
        formatCurrency={formatBirr}
      />
    </div>
  );
};

export default OrganizationOrders;
