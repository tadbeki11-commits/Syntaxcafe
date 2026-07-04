/**
 * Items Sold (Today) report: an aggregated breakdown of individual menu items
 * sold within a period, with quantity and revenue totals. Printed by cashiers as
 * an end-of-day snapshot of what left the kitchen/bar.
 */
import { ReceiptBlock } from "@/utils/receiptImage";
import { AMHARIC_FONT_STACK, printHTML } from "./html-printer";
import { escapeHtml } from "./format";
import {
  isTauriRuntime,
  resolveThermalPrinterName,
  printReceiptImage,
} from "./thermal-printer";

export interface ItemsSoldRow {
  unit: string;
  item: string;
  qtySold: number;
  revenue: number;
}

export interface ItemsSoldReportMeta {
  /** Human-readable label for the period, e.g. "Today" or a date string. */
  periodLabel: string;
  /** Number of settled/paid orders the rows were aggregated from. */
  ordersCount: number;
}

const formatBirr = (amount: number) =>
  `${Number(amount || 0).toLocaleString()} Birr`;

/**
 * Print an aggregated "Items Sold" report.
 *
 * @param rows - Aggregated item rows (unit, item, qtySold, revenue)
 * @param meta - Period label and order count for the report header
 */
export async function printItemsSoldReport(
  rows: ItemsSoldRow[],
  meta: ItemsSoldReportMeta,
) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const totalQty = safeRows.reduce(
    (sum, r) => sum + (parseInt(String(r.qtySold), 10) || 0),
    0,
  );
  const totalRevenue = safeRows.reduce(
    (sum, r) => sum + (Number(r.revenue) || 0),
    0,
  );

  const printedAt = new Date().toLocaleString();

  // 1. Try native thermal printing (Tauri) — renders as an image so Amharic
  //    item names print correctly.
  try {
    if (isTauriRuntime()) {
      const printerName = await resolveThermalPrinterName();

      if (printerName) {
        const blocks: ReceiptBlock[] = [
          { kind: "title", text: "Syntax Services" },
          { kind: "text", text: "ITEMS SOLD", align: "center", bold: true },
          { kind: "divider" },
          { kind: "text", text: `Period: ${meta.periodLabel}` },
          { kind: "text", text: `Printed: ${printedAt}` },
          { kind: "text", text: `Orders: ${meta.ordersCount}` },
          { kind: "divider" },
          {
            kind: "row",
            widths: [24, 8, 13],
            align: ["left", "right", "right"],
            cells: ["Item", "Qty", "Revenue"],
            bold: true,
          },
          { kind: "divider" },
        ];

        if (safeRows.length === 0) {
          blocks.push({
            kind: "text",
            text: "No items sold in this period.",
            align: "center",
          });
        } else {
          safeRows.forEach((r) => {
            blocks.push({
              kind: "row",
              widths: [24, 8, 13],
              align: ["left", "right", "right"],
              cells: [
                String(r.item || "").substring(0, 24),
                String(r.qtySold || 0),
                formatBirr(r.revenue),
              ],
            });
          });
        }

        blocks.push({ kind: "divider" });
        blocks.push({
          kind: "row",
          widths: [24, 8, 13],
          align: ["left", "right", "right"],
          cells: ["TOTAL", String(totalQty), formatBirr(totalRevenue)],
          bold: true,
        });
        blocks.push({ kind: "divider" });
        blocks.push({ kind: "gap", height: 12 });
        blocks.push({ kind: "text", text: "End of Report", align: "center" });

        await printReceiptImage(printerName, blocks);
        return; // Success
      }
    }
  } catch (err) {
    console.error(
      "Native items-sold print failed, falling back to HTML:",
      err,
    );
  }

  // 2. Fallback: browser HTML printing.
  const bodyRows = safeRows.length
    ? safeRows
        .map(
          (r) => `
      <tr>
        <td class="text-left">${escapeHtml(String(r.item || ""))}<div class="unit">${escapeHtml(String(r.unit || ""))}</div></td>
        <td class="text-right">${escapeHtml(String(r.qtySold || 0))}</td>
        <td class="text-right">${escapeHtml(formatBirr(r.revenue))}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="text-center">No items sold in this period.</td></tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Items Sold</title>
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
  .ticket { width: 80mm; padding: 5mm; background: white; }
  .rule { border-top: 1px dashed #000; margin: 8px 0; }
  .header { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 4px; }
  .section-title { text-align: center; font-weight: bold; font-size: 12px; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .text-center { text-align: center; }
  .unit { font-size: 8px; color: #666; text-transform: capitalize; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { text-align: left; font-size: 10px; padding: 2px 0; border-bottom: 1px solid #000; }
  td { font-size: 10px; padding: 3px 0; border-bottom: 1px dotted #ccc; vertical-align: top; }
  tfoot td { font-weight: bold; border-top: 1px solid #000; border-bottom: none; font-size: 11px; }
  .meta { font-size: 9px; color: #666; margin-top: 8px; }
  @media print { body { width: 80mm; } .ticket { padding: 3mm; } }
</style>
</head>
<body>
  <div class="ticket">
    <div class="header">Syntax Services</div>
    <div class="section-title">ITEMS SOLD</div>
    <div class="rule"></div>
    <div class="row"><span>Period:</span><span>${escapeHtml(meta.periodLabel)}</span></div>
    <div class="row"><span>Printed:</span><span>${escapeHtml(printedAt)}</span></div>
    <div class="row"><span>Orders:</span><span>${escapeHtml(String(meta.ordersCount))}</span></div>
    <div class="rule"></div>
    <table>
      <thead>
        <tr>
          <th class="text-left">Item</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Revenue</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
      <tfoot>
        <tr>
          <td class="text-left">TOTAL</td>
          <td class="text-right">${escapeHtml(String(totalQty))}</td>
          <td class="text-right">${escapeHtml(formatBirr(totalRevenue))}</td>
        </tr>
      </tfoot>
    </table>
    <div class="rule"></div>
    <div class="meta text-center">Printed via Cafe System · End of Report</div>
  </div>
</body>
</html>`;

  await printHTML(html);
}
