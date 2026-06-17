/**
 * Stock transfer receipts: prints a "Store Copy" (source/remaining) and a
 * "Barista Copy" (destination/new total) for an inventory transfer.
 */
import { getApproximateServerDate } from "@/shared/utils/serverTime";
import { ReceiptBlock } from "@/utils/receiptImage";
import { AMHARIC_FONT_STACK, printHTML } from "./html-printer";
import { escapeHtml, formatQtyBothUnits } from "./format";
import {
  isTauriRuntime,
  resolveThermalPrinterName,
  printReceiptImage,
} from "./thermal-printer";

export async function printStockTransferReceipts(
  transfer: any,
  inventoryItems: any[],
  stockLocations: any[] = [],
) {
  if (!transfer) return;

  const itemById = new Map<string, any>();
  (inventoryItems || []).forEach((item) => {
    itemById.set(String(item.id), item);
  });

  const locationById = new Map<string, string>();
  (stockLocations || []).forEach((loc) => {
    locationById.set(String(loc.id), loc.name || `Location #${loc.id}`);
  });

  const getLocationName = (locationId: string | number | null | undefined, fallback: string): string => {
    if (locationId == null) return fallback;
    return locationById.get(String(locationId)) || fallback;
  };

  const lines = Array.isArray(transfer.items) ? transfer.items : [];
  const timestamp = transfer.created_at
    ? new Date(transfer.created_at).toLocaleString()
    : getApproximateServerDate();
  const transferId = transfer.id || "N/A";

  const toNumber = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // Quantity currently on hand at a specific location (post-transfer, because the
  // caller refreshes inventory before printing). Falls back to null when the item
  // has no recorded stock for that location.
  const qtyAtLocation = (item: any, locationId: any): number | null => {
    if (!item || locationId == null) return null;
    const stockByLocation: any[] = Array.isArray(item?.stock_by_location)
      ? item.stock_by_location
      : [];
    const entry = stockByLocation.find(
      (s: any) => String(s.location_id) === String(locationId),
    );
    return entry ? toNumber(entry.quantity) : null;
  };

  // Balance left at the source (approver) / now held at the destination (receiver)
  // after this transfer. Prefer the exact source/destination location; fall back
  // to the legacy store/barista flat quantities for older data.
  const resolveCurrentQty = (item: any, role: "store" | "bar"): number => {
    const locationId =
      role === "store" ? transfer.from_location_id : transfer.to_location_id;
    const viaLocation = qtyAtLocation(item, locationId);
    if (viaLocation != null) return viaLocation;
    return role === "store"
      ? toNumber(item?.store_quantity ?? item?.quantity)
      : toNumber(item?.barista_quantity);
  };

  // 1. Try Native Thermal Printing if it's a Tauri app and printer is selected
  try {
    if (isTauriRuntime()) {
      const printerName = await resolveThermalPrinterName();

      if (printerName) {
        // Render each copy as an image so Amharic / Ge'ez inventory item names
        // and notes print correctly (ESC/POS text cannot encode Ethiopic).
        const buildBlocks = (
          title: string,
          role: "store" | "bar",
        ): ReceiptBlock[] => {
          const blocks: ReceiptBlock[] = [
            { kind: "title", text: "Syntax services" },
            {
              kind: "text",
              text: title.toUpperCase(),
              align: "center",
              bold: true,
            },
            { kind: "divider" },
            { kind: "text", text: `Transfer #: ${transferId}` },
            { kind: "text", text: `Date: ${timestamp}` },
            {
              kind: "text",
              text: `From: ${getLocationName(transfer.from_location_id, transfer.from_location || "store")}`,
            },
            { kind: "text", text: `To: ${getLocationName(transfer.to_location_id, transfer.to_location || "barista")}` },
            { kind: "text", text: `Status: ${transfer.status || "sent"}` },
            { kind: "divider" },
            {
              kind: "row",
              widths: [34, 14],
              align: ["left", "right"],
              bold: true,
              cells: ["Item / Stock", "Qty"],
            },
          ];

          lines.forEach((line: any) => {
            const item = itemById.get(String(line.inventory_item_id));
            const currentQty = resolveCurrentQty(item, role);
            const balanceLabel = role === "store" ? "Remaining" : "New total";

            blocks.push({
              kind: "row",
              widths: [34, 14],
              align: ["left", "right"],
              cells: [
                item?.name || "Item",
                formatQtyBothUnits(Number(line.quantity), item),
              ],
            });
            blocks.push({
              kind: "text",
              text: `  (${balanceLabel}: ${formatQtyBothUnits(currentQty, item)})`,
            });
          });

          if (transfer.notes) {
            blocks.push({ kind: "text", text: `Note: ${transfer.notes}` });
          }

          blocks.push({ kind: "divider" });
          blocks.push({ kind: "gap", height: 12 });
          blocks.push({ kind: "text", text: "Signature: __________________" });

          return blocks;
        };

        await printReceiptImage(printerName, buildBlocks("Store Copy", "store"));
        await printReceiptImage(printerName, buildBlocks("Barista Copy", "bar"));

        return; // Success!
      }
    }
  } catch (err) {
    console.error(
      "Native stock transfer print failed, falling back to HTML:",
      err,
    );
  }

  // 2. Fallback: Browser HTML Printing (Improved format)
  const renderRows = (role: "store" | "bar") =>
    lines
      .map((line: any) => {
        const item = itemById.get(String(line.inventory_item_id));
        const currentQty = resolveCurrentQty(item, role);
        const balanceLabel = role === "store" ? "Remaining" : "New total";

        return `
      <tr>
        <td style="padding-top: 4px;"><strong>${escapeHtml(item?.name || "Item")}</strong></td>
        <td class="num" style="padding-top: 4px;"><strong>${escapeHtml(formatQtyBothUnits(Number(line.quantity), item))}</strong></td>
      </tr>
      <tr>
        <td class="muted" style="padding-bottom: 4px; font-style: italic;">&nbsp;&nbsp;${balanceLabel}:</td>
        <td class="num muted" style="padding-bottom: 4px; font-style: italic;">${escapeHtml(formatQtyBothUnits(currentQty, item))}</td>
      </tr>
    `;
      })
      .join("");

  const renderReceipt = (
    title: string,
    role: "store" | "bar",
    pageBreak = false,
  ) => `
    <section class="ticket" style="${pageBreak ? "page-break-after: always;" : ""}">
      <div style="text-align:center;">
        <h1 style="font-size: 20px; margin: 0; text-transform: uppercase;">System</h1>
        <h2 style="font-size: 14px; margin: 4px 0; border: 1px solid #000; display: inline-block; padding: 2px 8px;">${title.toUpperCase()}</h2>
      </div>

      <div class="meta" style="margin-top: 8px;">
        <div class="pair"><span>Transfer #</span><strong>${escapeHtml(transferId)}</strong></div>
        <div class="pair"><span>Date</span><strong>${escapeHtml(timestamp)}</strong></div>
      </div>

      <div class="rule"></div>

      <div class="pair"><span>From</span><strong>${escapeHtml(getLocationName(transfer.from_location_id, transfer.from_location || "store"))}</strong></div>
      <div class="pair"><span>To</span><strong>${escapeHtml(getLocationName(transfer.to_location_id, transfer.to_location || "barista"))}</strong></div>
      <div class="pair"><span>Status</span><strong>${escapeHtml(transfer.status || "sent")}</strong></div>

      <div class="rule"></div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left; font-size: 12px; padding: 4px 0;">ITEM</th>
            <th style="text-align: right; font-size: 12px; padding: 4px 0;">QTY</th>
          </tr>
        </thead>
        <tbody>${renderRows(role)}</tbody>
      </table>

      ${transfer.notes
      ? `
        <div class="rule"></div>
        <div class="notes"><strong>Note:</strong> ${escapeHtml(transfer.notes)}</div>
      `
      : ""
    }

      <div class="rule"></div>
      <div class="signature" style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; text-align: center; font-size: 12px;">
        Authorized Signature
      </div>
      <div style="text-align: center; font-size: 10px; margin-top: 10px; color: #666;">
        Printed via Cafe System
        Only for internal use
      </div>
    </section>
  `;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Stock Transfer #${escapeHtml(transferId)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    width: 80mm;
    margin: 0;
    padding: 0;
    background: white;
    color: #000;
    font-family: ${AMHARIC_FONT_STACK};
  }
  .ticket {
    width: 80mm;
    padding: 10mm 5mm;
    background: white;
  }
  .rule { border-top: 1px dashed #000; margin: 10px 0; }
  .pair { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin: 4px 0; }
  .num { text-align: right; white-space: nowrap; }
  .muted { color: #333; font-size: 11px; }
  .notes { font-size: 12px; margin-top: 8px; line-height: 1.4; }

  @media print {
    body { width: 80mm; }
    .ticket { padding: 5mm; }
  }
</style>
</head>
<body>
  ${renderReceipt("Store Copy", "store", true)}
  ${renderReceipt("Barista Copy", "bar")}
</body>
</html>`;

  await printHTML(html);
}
