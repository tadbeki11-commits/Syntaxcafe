import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import api from '@/application';
import ConfirmCashPaymentModal from '@/pages/Dashboards/CashierDashboard/modals/ConfirmCashPaymentModal';
import { formatBirr, isOrderUnpaid, useOrgPayment } from './useOrgPayment';

export const OrganizationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [organization, setOrganization] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);

      // Gate cashier access by the admin-controlled setting.
      if (!isAdmin) {
        const settings = await api.settings.getOrganizationSettings();
        if (!settings?.allow_cashier_manage_org_orders) {
          setAllowed(false);
          return;
        }
      }

      const [orgRes, ordersRes] = await Promise.allSettled([
        api.organizations.getById(id),
        api.organizations.getOrders(id),
      ]);

      if (orgRes.status === 'fulfilled') {
        setOrganization(
          (orgRes.value as any)?.data?.data?.organization ?? null,
        );
      }
      if (ordersRes.status === 'fulfilled') {
        const list = (ordersRes.value as any)?.data?.data?.orders ?? [];
        setOrders(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('[OrganizationDetail] load failed', error);
      toast.error('Failed to load organization');
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const payment = useOrgPayment(load);

  if (!allowed) {
    return (
      <div className="p-6">
        <PageHeader title="Organization orders" />
        <Card className="mt-6">
          <CardContent className="py-10 text-center text-muted-foreground">
            Managing organization orders is currently disabled for cashiers.
            Ask an administrator to enable it.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title={organization?.name || 'Organization'}
        description="Orders placed under this organization."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/organizations')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {isAdmin && (
              <Button
                onClick={() =>
                  navigate(`/dashboard/organizations/${id}/create-order`)
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            )}
          </div>
        }
      />

      {organization && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Contact</p>
              <p>{organization.contact_name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p>{organization.phone || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p>{organization.email || '—'}</p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-muted-foreground">Address</p>
              <p>{organization.address || '—'}</p>
            </div>
            {organization.notes && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-muted-foreground">Notes</p>
                <p>{organization.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No orders for this organization yet.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id ?? order.localId}>
                    <TableCell className="font-medium">
                      #{order.id ?? order.localId}
                    </TableCell>
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
                          disabled={
                            payment.processingOrderId ===
                            String(order.id ?? order.localId)
                          }
                        >
                          {payment.processingOrderId ===
                          String(order.id ?? order.localId)
                            ? 'Processing...'
                            : 'Confirm Payment'}
                        </Button>
                      ) : (
                        <Badge variant="secondary">Paid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
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

export default OrganizationDetail;
