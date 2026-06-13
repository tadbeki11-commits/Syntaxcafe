import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Database, Package, MapPin, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import apiService from '@/application';
import { toast } from 'react-hot-toast';
import { getLocalDb, localDbTables } from '@/db/localDb';
import OfflineBanner from '@/components/OfflineBanner';
import { useSyncOnline } from '@/hooks/useSyncOnline';

const DataManagement = () => {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [allowLowStock, setAllowLowStock] = useState(false);
    const [savingInventorySettings, setSavingInventorySettings] = useState(false);
    const [forceTableSelection, setForceTableSelection] = useState(false);
    const [savingDiningSettings, setSavingDiningSettings] = useState(false);
    const [enableCashierReceipt, setEnableCashierReceipt] = useState(false);
    const [savingReceiptSettings, setSavingReceiptSettings] = useState(false);
    const online = useSyncOnline();

    useEffect(() => {
        Promise.all([
            apiService.settings.getSystemSettings(),
            apiService.settings.getTableSelectionSettings(),
            apiService.settings.getReceiptSettings()
        ]).then(([invSettings, diningSettings, receiptSettings]) => {
            setAllowLowStock(invSettings.allow_low_stock_orders);
            setForceTableSelection(diningSettings.force_table_selection);
            setEnableCashierReceipt(receiptSettings.enable_cashier_receipt);
        }).catch((err) => {
            console.error('Failed to load settings:', err);
        });
    }, []);

    const handleToggleLowStock = async (enabled: boolean) => {
        setSavingInventorySettings(true);
        try {
            await apiService.settings.updateInventorySettings({ allow_low_stock_orders: enabled });
            setAllowLowStock(enabled);
            toast.success(
                enabled
                    ? 'Orders can now be created with low stock ingredients.'
                    : 'Orders will be blocked when ingredients are low in stock.',
            );
        } catch (error: any) {
            toast.error('Failed to update inventory settings. Please try again.');
        } finally {
            setSavingInventorySettings(false);
        }
    };

    const handleToggleForceTableSelection = async (enabled: boolean) => {
        setSavingDiningSettings(true);
        try {
            await apiService.settings.updateTableSelectionSettings({ force_table_selection: enabled });
            setForceTableSelection(enabled);
            toast.success(
                enabled
                    ? 'Table selection is now mandatory for creating orders.'
                    : 'Table selection is optional (Take Away and Beu are allowed).',
            );
        } catch (error: any) {
            toast.error('Failed to update dining settings. Please try again.');
        } finally {
            setSavingDiningSettings(false);
        }
    };

    const handleToggleCashierReceipt = async (enabled: boolean) => {
        setSavingReceiptSettings(true);
        try {
            await apiService.settings.updateReceiptSettings({ enable_cashier_receipt: enabled });
            setEnableCashierReceipt(enabled);
            toast.success(
                enabled
                    ? 'Cashier receipt page is now enabled for cashiers.'
                    : 'Cashier receipt page is now hidden from cashiers.',
            );
        } catch (error: any) {
            toast.error('Failed to update receipt settings. Please try again.');
        } finally {
            setSavingReceiptSettings(false);
        }
    };

    const handleCleanup = async () => {
        setLoading(true);
        try {
            // 1. Cleanup backend data
            await apiService.settings.cleanupData();

            // 2. Cleanup frontend local data
            const db = await getLocalDb();
            const orders = await db.delete(localDbTables.orders);
            const payments = await db.delete(localDbTables.payments);

            // console.log("orders", orders);
            // console.log("payments", payments);

            toast.success('Data cleanup successful (Cloud & Local)');
            setIsConfirmOpen(false);
        } catch (error: any) {
            console.error('Cleanup failed:', error);
            const errorMsg = error.response?.data?.message || 'Cleanup failed. Please try again.';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <PageHeader
                title="Settings"
                description="System configuration and data management"
            />

            <div className="max-w-2xl mx-auto">
                <OfflineBanner online={online} />
            </div>

            <div className="grid gap-6 max-w-2xl mx-auto">
                {/* Inventory Settings */}
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Package className="h-5 w-5 text-primary" />
                            Inventory Settings
                        </CardTitle>
                        <CardDescription>
                            Configure how the system handles low stock situations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-background gap-4">
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm">Allow orders with low stock</h4>
                                <p className="text-xs text-muted-foreground">
                                    When enabled, orders can be created even if one or more ingredients
                                    are below the required quantity. Stock levels will go negative.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-xs font-semibold ${allowLowStock ? 'text-warning' : 'text-muted-foreground'}`}>
                                    {allowLowStock ? 'Enabled' : 'Disabled'}
                                </span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={allowLowStock}
                                    disabled={savingInventorySettings || !online}
                                    onClick={() => handleToggleLowStock(!allowLowStock)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
                                        allowLowStock ? 'bg-amber-500' : 'bg-muted'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${
                                            allowLowStock ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                        {allowLowStock && (
                            <p className="mt-3 text-xs text-warning flex items-start gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                Low stock orders are allowed. Inventory may go negative after payment is confirmed.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Dining Settings */}
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MapPin className="h-5 w-5 text-primary" />
                            Dining Settings
                        </CardTitle>
                        <CardDescription>
                            Configure table selection requirement rules for orders.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-background gap-4">
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm">Require table selection</h4>
                                <p className="text-xs text-muted-foreground">
                                    When enabled, a table number MUST be selected to create an order. Take Away and Beu dining options will be blocked.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-xs font-semibold ${forceTableSelection ? 'text-warning' : 'text-muted-foreground'}`}>
                                    {forceTableSelection ? 'Enabled' : 'Disabled'}
                                </span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={forceTableSelection}
                                    disabled={savingDiningSettings || !online}
                                    onClick={() => handleToggleForceTableSelection(!forceTableSelection)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
                                        forceTableSelection ? 'bg-amber-500' : 'bg-muted'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${
                                            forceTableSelection ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Receipt Settings */}
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Receipt className="h-5 w-5 text-primary" />
                            Receipt Settings
                        </CardTitle>
                        <CardDescription>
                            Control cashier access to the receipt generation page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-background gap-4">
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm">Enable cashier receipt page</h4>
                                <p className="text-xs text-muted-foreground">
                                    When enabled, cashiers can access the receipt generation page to print official receipts for orders.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-xs font-semibold ${enableCashierReceipt ? 'text-success' : 'text-muted-foreground'}`}>
                                    {enableCashierReceipt ? 'Enabled' : 'Disabled'}
                                </span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={enableCashierReceipt}
                                    disabled={savingReceiptSettings || !online}
                                    onClick={() => handleToggleCashierReceipt(!enableCashierReceipt)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
                                        enableCashierReceipt ? 'bg-green-500' : 'bg-muted'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${
                                            enableCashierReceipt ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            These actions are irreversible. Please proceed with extreme caution.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-destructive/20 rounded-lg bg-background gap-4">
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Database className="h-4 w-4" />
                                    Cleanup Orders & Payments
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    This will permanently delete ALL orders, order items, and payment records from the system.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setIsConfirmOpen(true)}
                                disabled={!online}
                                className="w-full sm:w-auto"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cleanup
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This action will permanently delete all orders and payment history.
                            This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleCleanup} disabled={loading}>
                            {loading ? 'Cleaning up...' : 'Yes, Delete Everything'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DataManagement;
