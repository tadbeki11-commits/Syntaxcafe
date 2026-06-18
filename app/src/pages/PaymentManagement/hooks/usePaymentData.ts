import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/application';
import toast from 'react-hot-toast';
import { getApproximateServerDateString } from '@/shared/utils/serverTime';
import { PaymentRecord, PendingOrderRecord } from '../types';

export const usePaymentData = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [ordersForPayment, setOrdersForPayment] = useState<PendingOrderRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPayment, setViewPayment] = useState<any>(null);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [pr, or, pm] = await Promise.all([
        api.payments.getAll(),
        api.orders.getOrdersForPayment(),
        api.settings.getPaymentMethods()
      ]);
      setPayments((pr as any)?.data?.data?.payments ?? (pr as any)?.data?.payments ?? []);
      setOrdersForPayment((or as any)?.data?.data?.orders ?? (or as any)?.data?.orders ?? []);
      const methodsList = (pm as any)?.data?.data?.payment_methods ?? (pm as any)?.data?.payment_methods ?? [];
      setPaymentMethods(Array.isArray(methodsList) ? methodsList : []);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredPayments = useMemo(() => {
    if (filterStatus === 'pending') {
      const rows = ordersForPayment.map(o => ({
        __type: 'order_pending',
        id: `ORDER-${o.id}`,
        order_id: o.id,
        amount: o.total_amount,
        payment_method: null,
        status: 'pending',
        created_at: o.updated_at || o.created_at
      } as PaymentRecord));
      return rows.filter(r => !searchTerm || String(r.order_id).includes(searchTerm));
    }
    return payments.filter(p => {
      const matchSearch = !searchTerm || String(p.id).includes(searchTerm) || String(p.order_id).includes(searchTerm);
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchMethod = filterMethod === 'all' || p.payment_method === filterMethod;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [payments, ordersForPayment, searchTerm, filterStatus, filterMethod]);

  const openView = useCallback(async (payment: any) => {
    try {
      setViewOpen(true);
      setViewLoading(true);
      setViewPayment(null);
      setViewOrder(null);
      const isPending = payment?.__type === 'order_pending';
      const [pr, or] = await Promise.all([
        !isPending && payment?.id ? api.payments.getById(payment.id).catch(() => null) : Promise.resolve(null),
        payment?.order_id ? api.orders.getById(payment.order_id).catch(() => null) : Promise.resolve(null)
      ]);
      setViewPayment(isPending ? payment : ((pr as any)?.data?.data?.payment ?? (pr as any)?.data?.payment ?? payment));
      setViewOrder((or as any)?.data?.data?.order ?? (or as any)?.data?.order ?? null);
    } catch {
      toast.error('Failed to load details');
    } finally {
      setViewLoading(false);
    }
  }, []);

  const stats = useMemo(() => {
    const today = getApproximateServerDateString();
    const todayRevenueVal = payments
      .filter(p => {
        if (p.status !== 'paid') return false;
        // paid_at is the real payment time; created_at can be the sync time for
        // payments that originated offline, which would drop them from today.
        const when = (p as any).paid_at || p.created_at;
        return when?.startsWith(today);
      })
      .reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);

    return {
      pendingCount: ordersForPayment.length,
      todayRevenue: `${todayRevenueVal.toLocaleString()} Birr`,
      qrCount: payments.filter(p => p.payment_method === 'qr_code' && p.status === 'paid').length,
      completedCount: payments.filter(p => p.status === 'paid').length,
    };
  }, [payments, ordersForPayment]);

  return {
    loading,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterMethod,
    setFilterMethod,
    viewOpen,
    setViewOpen,
    viewLoading,
    viewPayment,
    viewOrder,
    filteredPayments,
    ordersForPayment,
    openView,
    stats,
    paymentMethods
  };
};

export default usePaymentData;
