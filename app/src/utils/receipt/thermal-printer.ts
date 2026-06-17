/**
 * Native (Tauri) thermal-printing path. Each receipt is rendered to an image and
 * sent as a single bitmap section so Amharic / Ge'ez text prints correctly —
 * ESC/POS text mode cannot encode Ethiopic glyphs.
 */
import { getActivePrinterName } from "@/infrastructure/printing/printer-config";
import { renderReceiptImage, ReceiptBlock } from "@/utils/receiptImage";

/** True when running inside the Tauri desktop shell (native printing available). */
export function isTauriRuntime(): boolean {
  const w = window as any;
  return !!(
    w.__TAURI__ ||
    w.__TAURI_INTERNALS__ ||
    w.__TAURI_METADATA__ ||
    w.__TAURI_IPC__ ||
    navigator.userAgent.toLowerCase().includes("tauri")
  );
}

/**
 * Resolve the printer to use: the cashier's configured active printer, or the
 * first auto-detected thermal printer. Returns "" when none is available so the
 * caller can fall back to browser HTML printing.
 */
export async function resolveThermalPrinterName(): Promise<string> {
  let printerName = getActivePrinterName();
  if (!printerName) {
    const { list_thermal_printers } = await import("tauri-plugin-thermal-printer");
    const printers = (await list_thermal_printers()) as any;
    if (printers && printers.length > 0) {
      const first = printers[0];
      printerName =
        typeof first === "string" ? first : first.name || first.address || "";
    }
  }
  return printerName || "";
}

/**
 * Render the given blocks to an image and print one 80mm copy on `printerName`,
 * followed by a feed + partial cut.
 */
export async function printReceiptImage(
  printerName: string,
  blocks: ReceiptBlock[],
): Promise<void> {
  const { print_thermal_printer } = await import("tauri-plugin-thermal-printer");
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
}
