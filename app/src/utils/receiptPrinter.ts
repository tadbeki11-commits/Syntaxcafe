/**
 * Browser-based receipt printing for thermal printers.
 * Used for stock transfer, inventory location, and Z-report receipts.
 * (Order tickets are printed natively via the cashier auto-print queue.)
 *
 * Implementation lives in ./receipt/*; this barrel preserves the original
 * `@/utils/receiptPrinter` import path for existing consumers.
 */
export { printStockTransferReceipts } from "./receipt/stock-transfer-receipt";
export { printInventoryLocationReceipt } from "./receipt/inventory-location-receipt";
export { printZReport } from "./receipt/z-report-receipt";
