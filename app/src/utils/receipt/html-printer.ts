/**
 * Browser (HTML/iframe) printing path for receipts, with the bundled Ethiopic
 * font embedded so Amharic / Ge'ez text renders on the thermal printer.
 */

/**
 * Font stack used on every receipt so Amharic / Ge'ez (Ethiopic) text renders.
 * Plain `monospace`/`Courier` fonts have no Ethiopic glyphs, so Amharic prints
 * blank or as boxes. "Noto Sans Ethiopic" is bundled (see getAmharicFontFaceCss);
 * Nyala / Abyssinica SIL are OS-installed fallbacks.
 */
export const AMHARIC_FONT_STACK =
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
 * Print HTML content using a hidden iframe.
 * Injects the embedded Amharic @font-face so Ethiopic text renders, then waits
 * for the font to be ready before triggering the print.
 */
export async function printHTML(html: string) {
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
