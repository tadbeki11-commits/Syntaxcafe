// @ts-nocheck
import { paymentsAdapter } from '@/infrastructure/adapters/payments.adapter';

type PaymentsAdapter = typeof paymentsAdapter;

export class PaymentFacade {
  constructor(
    private readonly adapter: PaymentsAdapter,
  ) {}

  getAll = (params?: unknown, opts?: { localOnly?: boolean }) =>
    this.adapter.getAll(params, opts);
  getHistory = (params?: unknown) => this.adapter.getHistory(params);
  getById = (id: number | string) => this.adapter.getById(id);
  getByOrder = (orderId: number | string) => this.adapter.getByOrder(orderId);
  createWithQR = (paymentData: unknown) => this.adapter.createWithQR(paymentData);
  updateStatus = (id: number | string, statusData: unknown) =>
    this.adapter.updateStatus(id, statusData);
  generateQR = (id: number | string) => this.adapter.generateQR(id);
  confirm = (id: number | string, data: unknown) => this.adapter.confirm(id, data);
  getPending = (params?: unknown) => this.adapter.getPending(params);
  verifyQR = (qrData: unknown) => this.adapter.verifyQR(qrData);

  create = async (paymentData: Record<string, unknown>) => {
    const result = await this.adapter.create(paymentData);
    const payment =
      (result as any)?.data?.data?.payment ?? (result as any)?.data?.payment ?? paymentData;
    return result;
  };
}
