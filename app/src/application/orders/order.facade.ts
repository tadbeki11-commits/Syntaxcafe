// @ts-nocheck
import { ordersAdapter } from '@/infrastructure/adapters/orders.adapter';

type OrdersAdapter = typeof ordersAdapter;

export class OrderFacade {
  constructor(
    private readonly adapter: OrdersAdapter,
  ) {}

  getAll = (params?: unknown) => this.adapter.getAll(params);
  getById = (id: number | string) => this.adapter.getById(id);
  syncBulk = (data: unknown) => this.adapter.syncBulk(data);
  create = (orderData: unknown) => this.createCafe(orderData);
  updateStatus = (id: number | string, statusData: unknown) =>
    this.adapter.updateStatus(id, statusData);
  updateItems = (id: number | string, itemsData: unknown) =>
    this.adapter.updateItems(id, itemsData);
  addItems = (id: number | string, itemsData: unknown) =>
    this.adapter.addItems(id, itemsData);
  markReady = (id: number | string, data: unknown) =>
    this.adapter.markReady(id, data);
  complete = (id: number | string, data: unknown) =>
    this.adapter.complete(id, data);
  getPending = (params?: unknown) => this.adapter.getPending(params);
  getReady = (params?: unknown) => this.adapter.getReady(params);
  getKitchenOrders = () => this.adapter.getKitchenOrders();
  getStatusHistory = (id: number | string) => this.adapter.getStatusHistory(id);
  getOrdersForPayment = (params?: unknown) =>
    this.adapter.getOrdersForPayment(params);
  getOccupiedTables = () => this.adapter.getOccupiedTables();
  getUnprinted = (config?: unknown) => this.adapter.getUnprinted(config);
  getReceiptImages = (id: number | string) => this.adapter.getReceiptImages(id);
  getTicketPayload = (id: number | string) => this.adapter.getTicketPayload(id);
  markPrinted = (id: number | string) => this.adapter.markPrinted(id);
  printOrderNative = (id: number | string, printerName?: string) =>
    this.adapter.printOrderNative(id, printerName);
  testPrintNative = (printerName?: string) =>
    this.adapter.testPrintNative(printerName);
  getZReport = (params?: unknown) => this.adapter.getZReport(params);

  createCafe = async (orderData: any) => {
    const result = await this.adapter.createCafe(orderData);
    const order = (result as any)?.data?.data?.order ?? (result as any)?.data?.order ?? orderData;
    return result;
  };
}
