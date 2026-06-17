/**
 * Inventory location report: lists every inventory item held at a location with
 * its on-hand quantity in both base and purchase units.
 */
import { ReceiptBlock } from "@/utils/receiptImage";
import { AMHARIC_FONT_STACK, printHTML } from "./html-printer";
import { escapeHtml, formatQty } from "./format";
import {
  isTauriRuntime,
  resolveThermalPrinterName,
  printReceiptImage,
} from "./thermal-printer";

/**
 * Print all inventory items for a specific location
 * Shows location name at the top and lists all items with both base and purchase units
 *
 * @param {Object} location - The location object with id, name, etc.
 * @param {Array} inventoryItems - Array of inventory items with stock_by_location data
 * @returns {Promise<void>}
 */
export async function printInventoryLocationReceipt(
  location: any,
  inventoryItems: any[],
) {
  if (!location || !inventoryItems) return;

  const locationName = location.name || `Location #${location.id}`;
  const timestamp = new Date().toLocaleString();

  // Filter items that have stock at this location
  const locationItems = inventoryItems
    .map((item: any) => {
      const entry = item.stock_by_location?.find(
        (s: any) => s.location_id === location.id,
      );
      if (!entry) return null;
      return {
        ...item,
        quantity: Number(entry.quantity),
      };
    })
    .filter((item: any) => item !== null);

  // 1. Try Native Thermal Printing if it's a Tauri app and printer is selected
  try {
    if (isTauriRuntime()) {
      const printerName = await resolveThermalPrinterName();

      if (printerName) {
        // Render receipt as an image so Amharic / Ge'ez inventory item names
        // and notes print correctly (ESC/POS text cannot encode Ethiopic).
        const blocks: ReceiptBlock[] = [
          { kind: "title", text: "Syntax services" },
          {
            kind: "text",
            text: "INVENTORY REPORT",
            align: "center",
            bold: true,
          },
          { kind: "divider" },
          { kind: "text", text: `Location: ${locationName}` },
          { kind: "text", text: `Date: ${timestamp}` },
          { kind: "text", text: `Total Items: ${locationItems.length}` },
          { kind: "divider" },
          {
            kind: "row",
            widths: [30, 10, 8],
            align: ["left", "right", "right"],
            bold: true,
            cells: ["Item", "Base", "Purchase"],
          },
        ];

        locationItems.forEach((item: any) => {
          const piecesPerUnit = Math.max(1, Number(item.pieces_per_unit || 1));
          const baseUnit = item.base_unit || "pcs";
          const purchaseUnit = item.unit || "box";

          const baseQty = item.quantity;
          const purchaseQty = item.quantity / piecesPerUnit;

          const purchaseQtyText = piecesPerUnit > 1 && purchaseUnit !== baseUnit
            ? `${formatQty(purchaseQty)} ${purchaseUnit}`
            : "—";

          blocks.push({
            kind: "row",
            widths: [30, 10, 8],
            align: ["left", "right", "right"],
            cells: [
              item.name?.substring(0, 28) || "Item",
              `${formatQty(baseQty)} ${baseUnit}`,
              purchaseQtyText,
            ],
          });
        });

        blocks.push({ kind: "divider" });
        blocks.push({ kind: "gap", height: 12 });
        blocks.push({ kind: "text", text: "End of Report" });

        await printReceiptImage(printerName, blocks);

        return; // Success!
      }
    }
  } catch (err) {
    console.error(
      "Native inventory location print failed, falling back to HTML:",
      err,
    );
  }

  // 2. Fallback: Browser HTML Printing
  const renderRows = locationItems
    .map((item: any) => {
      const piecesPerUnit = Math.max(1, Number(item.pieces_per_unit || 1));
      const baseUnit = item.base_unit || "pcs";
      const purchaseUnit = item.unit || "box";

      const baseQty = item.quantity;
      const purchaseQty = item.quantity / piecesPerUnit;

      const purchaseQtyText = piecesPerUnit > 1 && purchaseUnit !== baseUnit
        ? `${escapeHtml(formatQty(purchaseQty))} ${escapeHtml(purchaseUnit)}`
        : "—";

      return `
      <tr>
        <td style="padding: 4px 0;"><strong>${escapeHtml(item.name || "Item")}</strong></td>
        <td class="num" style="padding: 4px 0;">${escapeHtml(formatQty(baseQty))} ${escapeHtml(baseUnit)}</td>
        <td class="num" style="padding: 4px 0;">${purchaseQtyText}</td>
      </tr>
    `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Inventory - ${escapeHtml(locationName)}</title>
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

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
  }
  th {
    text-align: left;
    font-size: 11px;
    padding: 4px 0;
    border-bottom: 1px solid #000;
  }
  td {
    font-size: 11px;
    padding: 2px 0;
  }

  @media print {
    body { width: 80mm; }
    .ticket { padding: 5mm; }
  }
</style>
</head>
<body>
  <div class="ticket">
    <div style="text-align:center;">
      <h1 style="font-size: 18px; margin: 0; text-transform: uppercase;">Syntax Services</h1>
      <h2 style="font-size: 14px; margin: 4px 0; font-weight: bold;">INVENTORY REPORT</h2>
    </div>

    <div class="rule"></div>

    <div class="pair"><span>Location</span><strong>${escapeHtml(locationName)}</strong></div>
    <div class="pair"><span>Date</span><strong>${escapeHtml(timestamp)}</strong></div>
    <div class="pair"><span>Total Items</span><strong>${locationItems.length}</strong></div>

    <div class="rule"></div>

    <table>
      <thead>
        <tr>
          <th style="width: 55%;">ITEM</th>
          <th style="width: 25%; text-align: right;">BASE</th>
          <th style="width: 20%; text-align: right;">PURCHASE</th>
        </tr>
      </thead>
      <tbody>${renderRows}</tbody>
    </table>

    <div class="rule"></div>
    <div style="text-align: center; font-size: 10px; margin-top: 10px; color: #666;">
      Printed via Cafe System
      ${escapeHtml(locationName)}
    </div>
  </div>
</body>
</html>`;

  await printHTML(html);
}
