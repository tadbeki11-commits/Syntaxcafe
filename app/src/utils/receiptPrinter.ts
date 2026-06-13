/**
 * Browser-based receipt printing for thermal printers.
 * Splits orders by department (category) and prints separate receipts for each.
 */
import api from "@/application";
import {
  getActivePrinterName,
  getPrinterForDepartment,
  getPrinterDepartmentMap,
} from "@/infrastructure/printing/printer-config";
import { getApproximateServerDate } from "@/shared/utils/serverTime";
import { renderReceiptImage, ReceiptBlock } from "@/utils/receiptImage";

/**
 * Font stack used on every receipt so Amharic / Ge'ez (Ethiopic) text renders.
 * Plain `monospace`/`Courier` fonts have no Ethiopic glyphs, so Amharic prints
 * blank or as boxes. "Noto Sans Ethiopic" is bundled (see getAmharicFontFaceCss);
 * Nyala / Abyssinica SIL are OS-installed fallbacks.
 */
const AMHARIC_FONT_STACK =
  "'Noto Sans Ethiopic', 'Nyala', 'Abyssinica SIL', monospace";

/**
 * Load the bundled Ethiopic font once and return an `@font-face` block with the
 * font embedded as a data URI. Embedding (rather than a plain URL) means the
 * print iframe needs no extra network/asset fetch and works fully offline.
 * Cached so the ~1MB font is only read and encoded once per session.
 */
let amharicFontFaceCss: Promise<string> | null = null;
function getAmharicFontFaceCss(): Promise<string> {
  if (!amharicFontFaceCss) {
    amharicFontFaceCss = (async () => {
      try {
        const res = await fetch(
          `${window.location.origin}/fonts/NotoSansEthiopic-Regular.ttf`,
        );
        if (!res.ok) throw new Error(`font fetch failed: ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        return `@font-face{font-family:'Noto Sans Ethiopic';font-style:normal;font-weight:400;src:url(data:font/ttf;base64,${base64}) format('truetype');}`;
      } catch (e) {
        console.warn(
          "Amharic font load failed; receipts fall back to system fonts:",
          e,
        );
        return "";
      }
    })();
  }
  return amharicFontFaceCss;
}

/**
 * Generate receipts split by department/category
 * Groups order items by their category and creates separate receipt HTML for each
 *
 * @param {Object} order - The order object with items
 * @returns {Array} Array of {department, html} objects
 */
function generateDepartmentReceipts(order: any) {
  if (!order || !order.items) return [];

  // Group items by category/department
  const departmentItems: Record<string, any[]> = {};

  order.items.forEach((item: any) => {
    const department =
      String(item?.main_category || item?.item_type || "")
        .trim()
        .toLowerCase() || "cafe";
    if (!departmentItems[department]) {
      departmentItems[department] = [];
    }
    departmentItems[department].push(item);
  });

  // Generate receipt HTML for each department
  const receipts: Array<{ department: string; html: string }> = [];
  let pageIndex = 0;
  const totalDepts = Object.keys(departmentItems).length;

  Object.entries(departmentItems).forEach(([department, items]) => {
    const pageBreak =
      pageIndex < totalDepts - 1 ? "page-break-after:always;" : "";

    let itemsHtml = "";
    let deptTotal = 0;

    items.forEach((item: any) => {
      const name = String(item.menu_item_name || item.name || "Item")
        .substring(0, 16)
        .padEnd(16, " ");
      const qty = String(item.quantity).padStart(3, " ");
      deptTotal += parseFloat(String(item.subtotal || 0));
      itemsHtml += `<div style="font-family:${AMHARIC_FONT_STACK};font-size:11px;line-height:1.4;">
        ${name} ${qty}
      </div>`;
    });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Order #${order.id} - ${department}</title>
<style>
  @page {
    size: 80mm auto;
    margin: 0;
    padding: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 80mm;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: ${AMHARIC_FONT_STACK};
    padding: 0;
  }
  .receipt {
    width: 80mm;
    padding: 4mm;
    ${pageBreak}
  }
  .header {
    text-align: center;
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 4mm;
  }
  .department {
    text-align: center;
    font-weight: bold;
    font-size: 12px;
    margin: 2mm 0;
    border: 1px solid #000;
    padding: 2mm;
  }
  .line {
    border-bottom: 1px solid #000;
    margin: 2mm 0;
  }
  .items {
    margin: 2mm 0;
    font-size: 10px;
  }
  .item-header {
    font-weight: bold;
    font-size: 10px;
    margin-bottom: 2mm;
  }
  .total {
    text-align: right;
    font-weight: bold;
    font-size: 12px;
    margin-top: 2mm;
    margin-bottom: 2mm;
  }
  .footer {
    text-align: center;
    font-size: 9px;
    margin-top: 2mm;
  }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">CAFE SYSTEM</div>
  <div class="department">${department.toUpperCase()}</div>
  <div class="line"></div>
  <div style="font-size:9px;margin:2mm 0;">
    Order #${order.id}<br>
    ${order.table_number ? `Table: ${order.table_number}` : "Take Away"}<br>
    ${new Date(order.created_at || getApproximateServerDate()).toLocaleString()}
  </div>
  <div class="line"></div>
  <div class="item-header">Item&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Qty</div>
  <div class="items">${itemsHtml}</div>
  <div class="line"></div>
  
  <div class="footer">Thank You!</div>
</div>
</body>
</html>`;

    receipts.push({ department, html });
    pageIndex++;
  });

  return receipts;
}

/**
 * Fetch receipt images from the server and print them via browser.
 * If no department-specific printer is assigned, splits the order into
 * separate receipts by department and prints all to the default printer.
 *
 * @param {Object} order - The order object (must have items array)
 * @returns {Promise<void>}
 */
export async function printOrderReceipt(order: any) {
  if (!order || !order.items) return;

  try {
    // Check if there's a default printer assigned to any department
    const printerDeptMap = getPrinterDepartmentMap();
    const hasDepartmentPrinters = Object.keys(printerDeptMap).length > 0;

    // If there ARE department-specific printers, try to get server receipts
    if (hasDepartmentPrinters && order.id) {
      try {
        const resp = (await api.orders.getReceiptImages(order.id)) as any;
        const images = resp?.data?.data?.images ?? [];
        const logo = resp?.data?.data?.logo ?? null;

        if (images.length > 0) {
          // Build print HTML with each ticket as a separate page
          const ticketPages = images
            .map((imgSrc: any, idx: number) => {
              const logoHtml = logo
                ? `<div style="text-align:center;margin-bottom:4px;"><img src="${logo}" style="max-width:300px;height:auto;" /></div>`
                : "";
              const pageBreak =
                idx < images.length - 1 ? "page-break-after:always;" : "";
              return `<div style="width:80mm;padding:0;margin:0;${pageBreak}">
              ${logoHtml}
              <img src="${imgSrc}" style="width:100%;height:auto;display:block;" />
            </div>`;
            })
            .join("");

          const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Order #${order.id}</title>
<style>
  @page {
    size: 80mm auto;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 80mm;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: ${AMHARIC_FONT_STACK};
  }
  img {
    image-rendering: auto;
  }
  @media print {
    body { width: 80mm; }
  }
</style>
</head>
<body>${ticketPages}</body>
</html>`;

          await printHTML(html);
          return;
        }
      } catch (err) {
        console.warn(
          "Server receipts failed, falling back to department-split receipts:",
          err,
        );
      }
    }

    // No department printers or server failed: generate split receipts locally
    const receipts = generateDepartmentReceipts(order);
    if (receipts.length === 0) {
      console.warn("No items to print");
      return;
    }

    // Combine all receipts into one HTML document for printing
    const allReceiptsHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Order #${order.id}</title>
<style>
  @page {
    size: 80mm auto;
    margin: 0;
    padding: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 80mm;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: ${AMHARIC_FONT_STACK};
  }
</style>
</head>
<body>
${receipts
        .map((r, idx) => {
          const doc = new DOMParser().parseFromString(r.html, "text/html");
          const body = doc.body.innerHTML;
          return body;
        })
        .join("")}
</body>
</html>`;

    await printHTML(allReceiptsHtml);
  } catch (e) {
    console.error("printOrderReceipt error:", e);
  }
}

/**
 * Print HTML content using a hidden iframe.
 * Injects the embedded Amharic @font-face so Ethiopic text renders, then waits
 * for the font to be ready before triggering the print.
 */
async function printHTML(html: string) {
  const fontFaceCss = await getAmharicFontFaceCss();
  const htmlWithFont = fontFaceCss
    ? html.replace("<head>", `<head><style>${fontFaceCss}</style>`)
    : html;
  return new Promise<void>((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "80mm";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Browser print error:", e);
      }
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {
          /* already removed */
        }
        resolve();
      }, 2000);
    };

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      resolve();
      return;
    }
    doc.open();
    doc.write(htmlWithFont);
    doc.close();

    // Wait for images + Amharic font to load, then print
    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => {
        const fonts = (iframe.contentWindow as any)?.document?.fonts;
        const fontsReady = fonts?.ready ?? Promise.resolve();
        // Extra delay for image rendering after fonts settle
        Promise.resolve(fontsReady).finally(() => setTimeout(doPrint, 300));
      };
    }

    // Fallback if onload doesn't fire within 3s
    setTimeout(doPrint, 3000);
  });
}

const escapeHtml = (value: any) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatQty = (value: any) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

// Helper to format quantity in both base and purchase units
const formatQtyBothUnits = (qty: number, item: any) => {
  const baseUnit = item?.base_unit || "pcs";
  const purchaseUnit = item?.unit || "box";
  const piecesPerUnit = Math.max(1, Number(item?.pieces_per_unit || 1));

  const baseQty = qty;
  const purchaseQty = qty / piecesPerUnit;

  // Only show purchase unit if it's different from base and pieces_per_unit > 1
  if (piecesPerUnit > 1 && purchaseUnit !== baseUnit) {
    return `${formatQty(baseQty)} ${baseUnit} (${formatQty(purchaseQty)} ${purchaseUnit})`;
  }
  return `${formatQty(baseQty)} ${baseUnit}`;
};

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
    const w = window as any;
    const isTauri = !!(
      w.__TAURI__ ||
      w.__TAURI_INTERNALS__ ||
      w.__TAURI_METADATA__ ||
      w.__TAURI_IPC__ ||
      navigator.userAgent.toLowerCase().includes("tauri")
    );

    if (isTauri) {
      const { print_thermal_printer, list_thermal_printers } =
        await import("tauri-plugin-thermal-printer");
      let printerName = getActivePrinterName();

      // If no printer selected, try to auto-detect the first available one
      if (!printerName) {
        const printers = (await list_thermal_printers()) as any;
        if (printers && printers.length > 0) {
          const first = printers[0];
          printerName =
            typeof first === "string"
              ? first
              : first.name || first.address || "";
        }
      }

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

        const printCopy = async (title: string, role: "store" | "bar") => {
          const imageData = await renderReceiptImage(buildBlocks(title, role));
          await print_thermal_printer({
            printer: printerName,
            paper_size: "Mm80",
            options: { code_page: 6, encode: "WINDOWS_1252" },
            sections: [
              {
                Image: {
                  data: imageData,
                  max_width: 0,
                  align: "center",
                  dithering: false,
                  size: "normal",
                },
              },
              { Feed: { feed_type: "lines", value: 3 } },
              { Cut: { mode: "partial", feed: 0 } },
            ],
          } as any);
        };

        await printCopy("Store Copy", "store");
        await printCopy("Barista Copy", "bar");

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
    const w = window as any;
    const isTauri = !!(
      w.__TAURI__ ||
      w.__TAURI_INTERNALS__ ||
      w.__TAURI_METADATA__ ||
      w.__TAURI_IPC__ ||
      navigator.userAgent.toLowerCase().includes("tauri")
    );

    if (isTauri) {
      const { print_thermal_printer, list_thermal_printers } =
        await import("tauri-plugin-thermal-printer");
      let printerName = getActivePrinterName();

      // If no printer selected, try to auto-detect the first available one
      if (!printerName) {
        const printers = (await list_thermal_printers()) as any;
        if (printers && printers.length > 0) {
          const first = printers[0];
          printerName =
            typeof first === "string"
              ? first
              : first.name || first.address || "";
        }
      }

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

        const imageData = await renderReceiptImage(blocks);
        await print_thermal_printer({
          printer: printerName,
          paper_size: "Mm80",
          options: { code_page: 6, encode: "WINDOWS_1252" },
          sections: [
            {
              Image: {
                data: imageData,
                max_width: 0,
                align: "center",
                dithering: false,
                size: "normal",
              },
            },
            { Feed: { feed_type: "lines", value: 3 } },
            { Cut: { mode: "partial", feed: 0 } },
          ],
        } as any);

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

export default printOrderReceipt;

/**
 * Print Z-Report for end-of-day/shift sales summary
 * 
 * @param {Object} zReport - The Z-report data object
 * @returns {Promise<void>}
 */
export async function printZReport(zReport: any) {
  if (!zReport) return;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // 1. Try Native Thermal Printing if it's a Tauri app and printer is selected
  try {
    const w = window as any;
    const isTauri = !!(
      w.__TAURI__ ||
      w.__TAURI_INTERNALS__ ||
      w.__TAURI_METADATA__ ||
      w.__TAURI_IPC__ ||
      navigator.userAgent.toLowerCase().includes("tauri")
    );

    if (isTauri) {
      const { print_thermal_printer, list_thermal_printers } =
        await import("tauri-plugin-thermal-printer");
      let printerName = getActivePrinterName();

      // If no printer selected, try to auto-detect the first available one
      if (!printerName) {
        const printers = (await list_thermal_printers()) as any;
        if (printers && printers.length > 0) {
          const first = printers[0];
          printerName =
            typeof first === "string"
              ? first
              : first.name || first.address || "";
        }
      }

      if (printerName) {
        // Render Z-report as an image so Amharic / Ge'ez text prints correctly
        const blocks: ReceiptBlock[] = [
          { kind: "title", text: "Syntax services" },
          {
            kind: "text",
            text: "Z-REPORT",
            align: "center",
            bold: true,
          },
          { kind: "divider" },
          { kind: "text", text: `Date: ${formatDate(zReport.report_date)}` },
          { kind: "text", text: `Period: ${formatDate(zReport.period_start)}` },
          { kind: "text", text: `To: ${formatDate(zReport.period_end)}` },
          { kind: "divider" },
          {
            kind: "text",
            text: "SUMMARY",
            align: "center",
            bold: true,
          },
          { kind: "divider" },
          {
            kind: "row",
            widths: [25, 20],
            align: ["left", "right"],
            cells: ["Total Orders:", String(zReport.summary.total_orders)],
          },
          {
            kind: "row",
            widths: [25, 20],
            align: ["left", "right"],
            cells: ["Gross Sales:", formatCurrency(zReport.summary.gross_sales)],
          },
          {
            kind: "row",
            widths: [25, 20],
            align: ["left", "right"],
            cells: ["Refunds:", formatCurrency(zReport.summary.refunds)],
          },
          {
            kind: "row",
            widths: [25, 20],
            align: ["left", "right"],
            cells: ["Net Sales:", formatCurrency(zReport.summary.net_sales)],
          },
          { kind: "divider" },
          {
            kind: "text",
            text: "PAYMENT BREAKDOWN",
            align: "center",
            bold: true,
          },
          { kind: "divider" },
        ];

        zReport.payment_breakdown.forEach((payment: any) => {
          blocks.push({
            kind: "row",
            widths: [20, 10, 15],
            align: ["left", "right", "right"],
            cells: [
              payment.method,
              String(payment.count),
              formatCurrency(payment.amount),
            ],
          });
        });

        blocks.push({ kind: "divider" });
        blocks.push({
          kind: "text",
          text: "EMPLOYEE ACTIVITY",
          align: "center",
          bold: true,
        });
        blocks.push({ kind: "divider" });

        zReport.employee_activity.forEach((employee: any) => {
          blocks.push({
            kind: "row",
            widths: [20, 8, 17],
            align: ["left", "right", "right"],
            cells: [
              employee.employee_name.substring(0, 18),
              String(employee.orders_count),
              formatCurrency(employee.total_sales),
            ],
          });
        });

        if (zReport.voided_transactions.length > 0) {
          blocks.push({ kind: "divider" });
          blocks.push({
            kind: "text",
            text: "VOIDED TRANSACTIONS",
            align: "center",
            bold: true,
          });
          blocks.push({ kind: "divider" });

          zReport.voided_transactions.forEach((txn: any) => {
            blocks.push({
              kind: "row",
              widths: [8, 15, 12],
              align: ["left", "left", "right"],
              cells: [
                `#${txn.order_id}`,
                txn.employee_name.substring(0, 12),
                formatCurrency(txn.amount),
              ],
            });
          });
        }

        blocks.push({ kind: "divider" });
        blocks.push({ kind: "gap", height: 12 });
        blocks.push({ kind: "text", text: "End of Z-Report" });

        const imageData = await renderReceiptImage(blocks);
        await print_thermal_printer({
          printer: printerName,
          paper_size: "Mm80",
          options: { code_page: 6, encode: "WINDOWS_1252" },
          sections: [
            {
              Image: {
                data: imageData,
                max_width: 0,
                align: "center",
                dithering: false,
                size: "normal",
              },
            },
            { Feed: { feed_type: "lines", value: 3 } },
            { Cut: { mode: "partial", feed: 0 } },
          ],
        } as any);

        return; // Success!
      }
    }
  } catch (err) {
    console.error("Native Z-report print failed, falling back to HTML:", err);
  }

  // 2. Fallback: Browser HTML Printing
  const paymentRows = zReport.payment_breakdown
    .map((p: any) => `
      <tr>
        <td class="text-left capitalize">${escapeHtml(p.method)}</td>
        <td class="text-right">${escapeHtml(String(p.count))}</td>
        <td class="text-right">${escapeHtml(formatCurrency(p.amount))}</td>
        <td class="text-right">${escapeHtml(p.percentage.toFixed(1))}%</td>
      </tr>
    `)
    .join("");

  const employeeRows = zReport.employee_activity
    .map((e: any) => `
      <tr>
        <td class="text-left">${escapeHtml(e.employee_name)}</td>
        <td class="text-right">${escapeHtml(String(e.orders_count))}</td>
        <td class="text-right">${escapeHtml(formatCurrency(e.total_sales))}</td>
      </tr>
    `)
    .join("");

  const voidedRows = zReport.voided_transactions.length > 0
    ? zReport.voided_transactions
      .map((v: any) => `
          <tr>
            <td class="text-left">#${escapeHtml(String(v.order_id))}</td>
            <td class="text-left">${escapeHtml(v.employee_name)}</td>
            <td class="text-right text-red-600">${escapeHtml(formatCurrency(v.amount))}</td>
            <td class="text-left">${escapeHtml(formatDate(v.created_at))}</td>
          </tr>
        `)
      .join("")
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Z-Report</title>
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
    padding: 5mm; 
    background: white;
  }
  .rule { border-top: 1px dashed #000; margin: 8px 0; }
  .header { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 4px; }
  .section-title { text-align: center; font-weight: bold; font-size: 12px; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .text-center { text-align: center; }
  .text-red-600 { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { text-align: left; font-size: 10px; padding: 2px 0; border-bottom: 1px solid #000; }
  td { font-size: 10px; padding: 2px 0; }
  .meta { font-size: 9px; color: #666; margin-top: 8px; }
  
  @media print {
    body { width: 80mm; }
    .ticket { padding: 3mm; }
  }
</style>
</head>
<body>
  <div class="ticket">
    <div class="header">Syntax Services</div>
    <div class="section-title">Z-REPORT</div>
    <div class="rule"></div>
    
    <div class="row"><span>Date:</span><span>${escapeHtml(formatDate(zReport.report_date))}</span></div>
    <div class="row"><span>Period:</span><span>${escapeHtml(formatDate(zReport.period_start))}</span></div>
    <div class="row"><span>To:</span><span>${escapeHtml(formatDate(zReport.period_end))}</span></div>
    
    <div class="rule"></div>
    <div class="section-title">SUMMARY</div>
    <div class="rule"></div>
    <div class="row"><span>Total Orders:</span><span>${escapeHtml(String(zReport.summary.total_orders))}</span></div>
    <div class="row"><span>Gross Sales:</span><span>${escapeHtml(formatCurrency(zReport.summary.gross_sales))}</span></div>
    <div class="row"><span>Refunds:</span><span class="text-red-600">${escapeHtml(formatCurrency(zReport.summary.refunds))}</span></div>
    <div class="row"><span>Net Sales:</span><span>${escapeHtml(formatCurrency(zReport.summary.net_sales))}</span></div>
    
    <div class="rule"></div>
    <div class="section-title">PAYMENT BREAKDOWN</div>
    <div class="rule"></div>
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th class="text-right">Count</th>
          <th class="text-right">Amount</th>
          <th class="text-right">%</th>
        </tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>
    
    <div class="rule"></div>
    <div class="section-title">EMPLOYEE ACTIVITY</div>
    <div class="rule"></div>
    <table>
      <thead>
        <tr>
          <th>Employee</th>
          <th class="text-right">Orders</th>
          <th class="text-right">Sales</th>
        </tr>
      </thead>
      <tbody>${employeeRows}</tbody>
    </table>
    
    ${zReport.voided_transactions.length > 0 ? `
    <div class="rule"></div>
    <div class="section-title">VOIDED TRANSACTIONS</div>
    <div class="rule"></div>
    <table>
      <thead>
        <tr>
          <th>Order</th>
          <th>Employee</th>
          <th class="text-right">Amount</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${voidedRows}</tbody>
    </table>
    ` : ''}
    
    <div class="rule"></div>
    <div class="meta text-center">
      Printed via Cafe System
      End of Z-Report
    </div>
  </div>
</body>
</html>`;

  await printHTML(html);
}
