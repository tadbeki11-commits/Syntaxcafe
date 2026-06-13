import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/application';
import { syncEngine } from '@/infrastructure/sync/sync-engine';

export const formatBirr = (val: any) => {
  const n = Number(val);
  return `${(Number.isFinite(n) ? n : 0).toLocaleString()} Birr`;
};

/** An order still owes money unless it is cancelled or already paid. */
export const isOrderUnpaid = (order: any) => {
  const status = String(order?.status || '').toLowerCase();
  const paymentStatus = String(order?.payment_status || '').toLowerCase();
  return (
    status !== 'cancelled' && status !== 'paid' && paymentStatus !== 'paid'
  );
};

/**
 * Shared confirm-payment flow for organization orders. Handles the modal
 * state, the create + confirm payment calls, and re-loading afterwards.
 * `onDone` is invoked after a successful (or recovered) confirmation so the
 * caller can refresh its order list.
 */
export const useOrgPayment = (onDone: () => void | Promise<void>) => {
  const { user } = useAuth() as any;

  const [confirmOrder, setConfirmOrder] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null,
  );

  const openConfirmPayment = (order: any) => {
    if (!order) return;
    setConfirmOrder(order);
    setPaymentMethod('cash');
    setShowConfirmModal(true);
  };

  const closeModal = (open: boolean) => {
    setShowConfirmModal(open);
    if (!open) setConfirmOrder(null);
  };

  const handleConfirmPayment = async () => {
    const order = confirmOrder;
    if (!order) return;

    const orderId = String(order.id ?? order.localId ?? "").trim();
    if (!orderId) {
      toast.error('This order has not been saved yet. Sync first, then retry.');
      return;
    }

    try {
      setProcessingOrderId(orderId);

      const method = paymentMethod || 'cash';
      const paymentData = {
        order_id: orderId,
        amount: order.total_amount,
        payment_method: method,
        status: method === 'cash' ? 'paid' : 'pending',
        processed_by: user?.id,
      };

      const createResp = (await api.payments.create(paymentData)) as any;
      const createdPayment =
        createResp?.data?.data?.payment ?? createResp?.data?.payment ?? null;

      if (createdPayment?.id) {
        await api.payments.confirm(createdPayment.id, {
          processed_by: user?.id,
        });
      }

      toast.success('Payment confirmed');
      setShowConfirmModal(false);
      setConfirmOrder(null);
      syncEngine.notifyListeners();
      await onDone();
    } catch (error: any) {
      console.error('[useOrgPayment] confirm payment failed', error);
      if (
        error?.response?.status === 400 &&
        String(error?.response?.data?.message || '').includes('already exists')
      ) {
        toast.error('Payment already recorded for this order');
      } else {
        toast.error('Failed to confirm payment');
      }
      await onDone();
    } finally {
      setProcessingOrderId(null);
    }
  };

  return {
    confirmOrder,
    showConfirmModal,
    closeModal,
    paymentMethod,
    setPaymentMethod,
    processingOrderId,
    openConfirmPayment,
    handleConfirmPayment,
  };
};
