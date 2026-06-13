import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '@/application';
import { Payment, Transaction, TransactionHistoryData, CreditSummary, ServiceRow } from '../types';
import { DEFAULT_HISTORY_LIMIT } from '../constants';

export const useCreditManagement = (orgs: any[]) => {
  // Add Payment tab state
  const [payOrgId, setPayOrgId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Transactions tab state
  const [txOrgId, setTxOrgId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txNotes, setTxNotes] = useState('');
  const [txServices, setTxServices] = useState<ServiceRow[]>([{ description: '', cost: '' }]);
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [txOrgPayments, setTxOrgPayments] = useState<Payment[]>([]);
  const [txOrgTransactions, setTxOrgTransactions] = useState<Transaction[]>([]);
  const [txCreditBalance, setTxCreditBalance] = useState<number | null>(null);
  const [openPaymentDetail, setOpenPaymentDetail] = useState<string | null>(null);

  // Transaction History tab state
  const [historyOrgId, setHistoryOrgId] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(DEFAULT_HISTORY_LIMIT);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<TransactionHistoryData | null>(null);

  // Payment List tab state
  const [paymentListOrgId, setPaymentListOrgId] = useState('');
  const [paymentListLoading, setPaymentListLoading] = useState(false);
  const [paymentListData, setPaymentListData] = useState<{ payments: Payment[]; transactions: Transaction[] } | null>(null);

  // Load credit data when tx org changes
  useEffect(() => {
    if (!txOrgId) { setTxOrgPayments([]); setTxOrgTransactions([]); setTxCreditBalance(null); return; }
    (async () => {
      try {
        const res = await api.organizations.getCreditSummary(txOrgId);
        const d = (res as any)?.data?.data;
        setTxOrgPayments(Array.isArray(d?.payments) ? d.payments : []);
        setTxOrgTransactions(Array.isArray(d?.transactions) ? d.transactions : []);
        setTxCreditBalance(typeof d?.credit_balance === 'number' ? d.credit_balance : Number(d?.organization?.credit_balance ?? 0));
      } catch {
        setTxOrgPayments([]); setTxOrgTransactions([]); setTxCreditBalance(null);
      }
    })();
  }, [txOrgId]);

  // Load transaction history when history org or page changes
  useEffect(() => {
    if (!historyOrgId) { setHistoryData(null); return; }
    (async () => {
      try {
        setHistoryLoading(true);
        const res = await api.organizations.getTransactions(historyOrgId, historyPage, historyLimit);
        setHistoryData((res as any)?.data?.data ?? null);
      } catch {
        setHistoryData(null);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [historyOrgId, historyPage]);

  // Load payment list when payment list org changes
  useEffect(() => {
    if (!paymentListOrgId) { setPaymentListData(null); return; }
    (async () => {
      try {
        setPaymentListLoading(true);
        const res = await api.organizations.getCreditSummary(paymentListOrgId);
        const d = (res as any)?.data?.data;
        setPaymentListData({
          payments: Array.isArray(d?.payments) ? d.payments : [],
          transactions: Array.isArray(d?.transactions) ? d.transactions : [],
        });
      } catch {
        setPaymentListData(null);
      } finally {
        setPaymentListLoading(false);
      }
    })();
  }, [paymentListOrgId]);

  const handleAddPayment = async (loadOrgs: () => void) => {
    if (!payOrgId) { toast.error('Select an organization'); return; }
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
    try {
      setPaySubmitting(true);
      await api.organizations.addPayment(payOrgId, { amount: amt, payment_date: payDate, notes: payNotes });
      toast.success('Payment added successfully');
      setPayAmount(''); setPayNotes(''); loadOrgs();
    } catch { toast.error('Failed to add payment'); }
    finally { setPaySubmitting(false); }
  };

  const addServiceRow = () => setTxServices(prev => [...prev, { description: '', cost: '' }]);
  const removeServiceRow = (i: number) => setTxServices(prev => prev.filter((_, idx) => idx !== i));
  const updateServiceRow = (i: number, field: keyof ServiceRow, val: string) =>
    setTxServices(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const txTotal = txServices.reduce((s, r) => s + (Number(r.cost) || 0), 0);

  const handleAddTransaction = async (loadOrgs: () => void) => {
    if (!txOrgId) { toast.error('Select an organization'); return; }
    const services = txServices.map(s => ({ description: s.description.trim(), cost: Number(s.cost) || 0 })).filter(s => s.description);
    if (services.length === 0) { toast.error('Add at least one service with a description'); return; }
    try {
      setTxSubmitting(true);
      await api.organizations.addTransaction(txOrgId, {
        transaction_date: txDate, notes: txNotes, services,
      });
      toast.success('Transaction recorded (automatically linked to payment)');
      setTxServices([{ description: '', cost: '' }]); setTxNotes('');
      // Refresh credit data
      const res = await api.organizations.getCreditSummary(txOrgId);
      const d = (res as any)?.data?.data;
      setTxOrgPayments(Array.isArray(d?.payments) ? d.payments : []);
      setTxOrgTransactions(Array.isArray(d?.transactions) ? d.transactions : []);
      setTxCreditBalance(typeof d?.credit_balance === 'number' ? d.credit_balance : Number(d?.organization?.credit_balance ?? 0));
      loadOrgs();
    } catch { toast.error('Failed to record transaction'); }
    finally { setTxSubmitting(false); }
  };

  return {
    // Add Payment
    payOrgId, setPayOrgId,
    payAmount, setPayAmount,
    payDate, setPayDate,
    payNotes, setPayNotes,
    paySubmitting,
    handleAddPayment,
    
    // Record Transaction
    txOrgId, setTxOrgId,
    txDate, setTxDate,
    txNotes, setTxNotes,
    txServices,
    txSubmitting,
    txOrgPayments,
    txOrgTransactions,
    txCreditBalance,
    openPaymentDetail, setOpenPaymentDetail,
    addServiceRow,
    removeServiceRow,
    updateServiceRow,
    txTotal,
    handleAddTransaction,
    
    // Transaction History
    historyOrgId, setHistoryOrgId,
    historyPage, setHistoryPage,
    historyLimit,
    historyLoading,
    historyData,
    
    // Payment List
    paymentListOrgId, setPaymentListOrgId,
    paymentListLoading,
    paymentListData,
  };
};
