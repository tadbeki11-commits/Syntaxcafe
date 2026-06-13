import { useState, useEffect, useCallback } from 'react';
import api from '@/application';
import toast from 'react-hot-toast';
import { Payment, Order } from '@/types/api.types';

export interface ReceiptFormat {
  // Business Information
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;

  // Receipt Information
  receiptTitle: string;
  showReceiptNumber: boolean;
  showDate: boolean;
  showTime: boolean;

  // Transaction Details
  showOrderNumber: boolean;
  showTableNumber: boolean;
  showCashierName: boolean;
  showCustomerInfo: boolean;

  // Financial Details
  showSubtotal: boolean;
  showServiceCharge: boolean;
  serviceChargeRate: number;
  showTax: boolean;
  taxRate: number;
  showDiscount: boolean;
  discountAmount: number;

  // Payment Details
  showPaymentMethod: boolean;
  showTransactionRef: boolean;

  // Footer
  receiptFooter: string;
  showSignature: boolean;
  showRefundPolicy: string;

  // Currency
  currency: string;
}

const defaultFormat: ReceiptFormat = {
  // Business Information
  businessName: 'OFFLINE CAFE SYSTEM',
  businessAddress: 'Addis Ababa, Ethiopia',
  businessPhone: '+251 911 000 000',
  businessEmail: 'info@offlinecafe.com',

  // Receipt Information
  receiptTitle: 'OFFICIAL RECEIPT',
  showReceiptNumber: true,
  showDate: true,
  showTime: true,

  // Transaction Details
  showOrderNumber: true,
  showTableNumber: true,
  showCashierName: true,
  showCustomerInfo: false,

  // Financial Details
  showSubtotal: true,
  showServiceCharge: true,
  serviceChargeRate: 10,
  showTax: true,
  taxRate: 15,
  showDiscount: false,
  discountAmount: 0,

  // Payment Details
  showPaymentMethod: true,
  showTransactionRef: true,

  // Footer
  receiptFooter: 'Thank you for your business!',
  showSignature: true,
  showRefundPolicy: 'No refunds after 24 hours',

  // Currency
  currency: 'Birr'
};

export const useReceiptData = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptFormat, setReceiptFormat] = useState<ReceiptFormat>(() => {
    const saved = localStorage.getItem('receiptFormat');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaultFormat to ensure new properties are populated
        return { ...defaultFormat, ...parsed, serviceChargeRate: parsed.serviceChargeRate ?? defaultFormat.serviceChargeRate };
      } catch (e) {
        console.error('Failed to parse saved receipt format', e);
      }
    }
    return defaultFormat;
  });

  useEffect(() => {
    localStorage.setItem('receiptFormat', JSON.stringify(receiptFormat));
  }, [receiptFormat]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [pr, or] = await Promise.all([
        api.payments.getAll(),
        api.orders.getAll()
      ]);
      setPayments((pr as any)?.data?.data?.payments ?? (pr as any)?.data?.payments ?? []);
      setOrders((or as any)?.data?.data ?? (or as any)?.data?.orders ?? []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const selectPayment = useCallback((payment: Payment) => {
    setSelectedPayment(payment);
    setSelectedOrder(null);
  }, []);

  const selectOrder = useCallback(async (order: Order) => {
    try {
      setLoadingOrder(true);
      // Fetch full order details with items
      const fullOrder = await api.orders.getById(order.id);
      const orderData = (fullOrder as any)?.data?.data?.order ?? (fullOrder as any)?.data?.order ?? order;
      setSelectedOrder(orderData);
    } catch (error) {
      // If fetch fails, use the basic order data
      setSelectedOrder(order);
    } finally {
      setLoadingOrder(false);
    }
  }, []);

  const filteredPayments = payments.filter(p => {
    if (!searchTerm) return true;
    return String(p.id).includes(searchTerm) || String(p.order_id).includes(searchTerm);
  });

  const filteredOrders = orders.filter(o => {
    if (!searchTerm) return true;
    return String(o.id).includes(searchTerm) || (o.table_number && String(o.table_number).includes(searchTerm));
  });

  return {
    loading,
    loadingOrder,
    payments: filteredPayments,
    orders: filteredOrders,
    selectedPayment,
    selectedOrder,
    searchTerm,
    setSearchTerm,
    selectPayment,
    selectOrder,
    receiptFormat,
    setReceiptFormat
  };
};

export default useReceiptData;
