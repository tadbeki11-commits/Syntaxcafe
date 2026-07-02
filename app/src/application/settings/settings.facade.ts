// @ts-nocheck
import { settingsAdapter } from '@/infrastructure/adapters/settings.adapter';

type SettingsAdapter = typeof settingsAdapter;

export class SettingsFacade {
  constructor(
    private readonly adapter: SettingsAdapter,
  ) {}

  getPaymentMethods = () => this.adapter.getPaymentMethods();
  getRoles = () => this.adapter.getRoles();
  getRole = (id: number | string) => this.adapter.getRole(id);
  getCurrentUserSettings = () => this.adapter.getCurrentUserSettings();
  updateCancelPassword = (password: string) =>
    this.adapter.updateCancelPassword(password);
  updatePrintCopies = (copies: number) => this.adapter.updatePrintCopies(copies);

  createPaymentMethod = async (data: any) => {
    return this.adapter.createPaymentMethod(data as any);
  };

  updatePaymentMethod = async (id: number | string, data: any) => {
    return this.adapter.updatePaymentMethod(id, data as any);
  };

  deletePaymentMethod = async (id: number | string) => {
    return this.adapter.deletePaymentMethod(id);
  };

  createRole = async (data: any) => {
    return this.adapter.createRole(data as any);
  };

  updateRole = async (id: number | string, data: any) => {
    return this.adapter.updateRole(id, data as any);
  };

  deleteRole = async (id: number | string) => {
    return this.adapter.deleteRole(id);
  };

  syncAllSystemSettings = () => this.adapter.syncAllSystemSettings();
  getSystemSettings = () => this.adapter.getSystemSettings();
  getLocalInventorySettings = () => this.adapter.getLocalInventorySettings();
  updateInventorySettings = (data: { allow_low_stock_orders: boolean }) =>
    this.adapter.updateInventorySettings(data);

  getTableSelectionSettings = () => this.adapter.getTableSelectionSettings();
  getLocalTableSelectionSettings = () => this.adapter.getLocalTableSelectionSettings();
  updateTableSelectionSettings = (data: { force_table_selection: boolean }) =>
    this.adapter.updateTableSelectionSettings(data);

  getOrganizationSettings = () => this.adapter.getOrganizationSettings();
  getLocalOrganizationSettings = () =>
    this.adapter.getLocalOrganizationSettings();
  updateOrganizationSettings = (data: {
    allow_cashier_manage_org_orders: boolean;
  }) => this.adapter.updateOrganizationSettings(data);

  getPrinterRoutingSettings = () => this.adapter.getPrinterRoutingSettings();
  getLocalPrinterRoutingSettings = () =>
    this.adapter.getLocalPrinterRoutingSettings();
  updatePrinterRoutingSettings = (map: Record<string, any>) =>
    this.adapter.updatePrinterRoutingSettings(map);

  getPrinterPasswordStatus = () => this.adapter.getPrinterPasswordStatus();
  verifyPrinterPassword = (password: string) =>
    this.adapter.verifyPrinterPassword(password);

  getReceiptSettings = () => this.adapter.getReceiptSettings();
  getLocalReceiptSettings = () => this.adapter.getLocalReceiptSettings();
  updateReceiptSettings = (data: { enable_cashier_receipt: boolean }) =>
    this.adapter.updateReceiptSettings(data);
}
