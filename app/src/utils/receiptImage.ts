/**
 * Renders receipt content to a monochrome bitmap (base64 PNG) using a bundled
 * Ethiopic font, so Amharic / Ge'ez text can be printed on ESC/POS thermal
 * printers. Those printers can only print the glyphs baked into their own code
 * pages (Latin, etc.) and cannot encode Ethiopic at all via text commands —
 * the only way to print Amharic is to rasterize it client-side and send it as
 * an image. The bundled font lives at /public/fonts/NotoSansEthiopic-Regular.ttf.
 */

export type ReceiptAlign = "left" | "center" | "right";

export type ReceiptBlock =
  | { kind: "title"; text: string }
  | {
      kind: "text";
      text: string;
      align?: ReceiptAlign;
      bold?: boolean;
      large?: boolean;
    }
  | { kind: "divider" }
  | { kind: "gap"; height?: number }
  | {
      kind: "row";
      /** Relative column weights; length must match cells. */
      widths: number[];
      cells: string[];
      align?: ReceiptAlign[];
      bold?: boolean;
    };

const PRINT_WIDTH = 576; // 80mm @ 203 dpi printable dots
const PADDING = 16;
const FONT_FAMILY = "'Noto Sans Ethiopic', 'Nyala', sans-serif";

const FONT_SIZE = 28;
const TITLE_SIZE = 32;
const LARGE_SIZE = 28;

let fontReady: Promise<void> | null = null;
/** Loads the bundled Ethiopic font into the document once so canvas can use it. */
function ensureEthiopicFont(): Promise<void> {
  if (!fontReady) {
    fontReady = (async () => {
      try {
        if (typeof (window as any).FontFace === "undefined") return;
        const url = `${window.location.origin}/fonts/NotoSansEthiopic-Regular.ttf`;
        const face = new FontFace("Noto Sans Ethiopic", `url(${url})`);
        await face.load();
        (document as any).fonts.add(face);
      } catch (e) {
        console.warn("Ethiopic font load failed for receipt image:", e);
      }
    })();
  }
  return fontReady;
}

function fontFor(bold: boolean, size: number) {
  return `${bold ? "bold " : ""}${size}px ${FONT_FAMILY}`;
}

function blockHeight(b: ReceiptBlock): number {
  switch (b.kind) {
    case "title":
      return TITLE_SIZE + 14;
    case "text":
      return (b.large ? LARGE_SIZE : FONT_SIZE) + 12;
    case "divider":
      return 18;
    case "gap":
      return b.height ?? 12;
    case "row":
      return FONT_SIZE + 12;
  }
}

function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (maxWidth <= 0) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let t = text;
  while (t.length > 0 && ctx.measureText(t + ellipsis).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + ellipsis;
}

function drawAligned(
  ctx: CanvasRenderingContext2D,
  text: string,
  boxX: number,
  boxW: number,
  y: number,
  align: ReceiptAlign,
) {
  ctx.textAlign = align;
  const x =
    align === "center"
      ? boxX + boxW / 2
      : align === "right"
        ? boxX + boxW
        : boxX;
  ctx.fillText(truncateToWidth(ctx, text, boxW), x, y);
}

/**
 * Render the given blocks to a base64-encoded PNG (no data-URI prefix),
 * sized to fit an 80mm receipt and using the Ethiopic font.
 */
export async function renderReceiptImage(
  blocks: ReceiptBlock[],
): Promise<string> {
  await ensureEthiopicFont();

  const totalHeight =
    PADDING * 2 + blocks.reduce((sum, b) => sum + blockHeight(b), 0);

  const canvas = document.createElement("canvas");
  canvas.width = PRINT_WIDTH;
  canvas.height = Math.ceil(totalHeight);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";

  const contentX = PADDING;
  const contentW = PRINT_WIDTH - PADDING * 2;
  let y = PADDING;

  for (const b of blocks) {
    const h = blockHeight(b);
    switch (b.kind) {
      case "title":
        ctx.font = fontFor(true, TITLE_SIZE);
        drawAligned(ctx, b.text, contentX, contentW, y, "center");
        break;
      case "text":
        ctx.font = fontFor(!!b.bold, b.large ? LARGE_SIZE : FONT_SIZE);
        drawAligned(ctx, b.text, contentX, contentW, y, b.align ?? "left");
        break;
      case "divider":
        ctx.fillRect(contentX, y + Math.floor(h / 2), contentW, 2);
        break;
      case "gap":
        break;
      case "row": {
        ctx.font = fontFor(!!b.bold, FONT_SIZE);
        const totalWeight = b.widths.reduce((a, c) => a + c, 0) || 1;
        const gutter = 6;
        let x = contentX;
        for (let i = 0; i < b.cells.length; i++) {
          const colW = (b.widths[i] / totalWeight) * contentW;
          const align = b.align?.[i] ?? "left";
          drawAligned(
            ctx,
            String(b.cells[i] ?? ""),
            x,
            colW - gutter,
            y,
            align,
          );
          x += colW;
        }
        break;
      }
    }
    y += h;
  }

  return canvas.toDataURL("image/png").split(",")[1];
}
