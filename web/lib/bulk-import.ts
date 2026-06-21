// Shared primitives for the bulk importers (inventory, staff, …).
// Pure helpers + a generic CSV/JSON → raw-row mapper, plus one small DOM helper
// for template downloads. Entity-specific validation lives in its own module.

export const slugify = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

export const str = (value: unknown) =>
  value === undefined || value === null ? "" : String(value).trim();

export const toBool = (value: unknown, fallback = true): boolean => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "active"].includes(s)) return true;
  if (["false", "0", "no", "n", "inactive"].includes(s)) return false;
  return fallback;
};

/** Parse a numeric cell. Returns null for empty/invalid input. */
export const toNumber = (value: unknown): number | null => {
  const s = str(value);
  if (s === "") return null;
  const parsed = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── CSV parsing (RFC-4180-ish: quotes, escaped quotes, embedded newlines) ──
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") pushField();
    else if (char === "\r") {
      /* ignore */
    } else if (char === "\n") pushRow();
    else field += char;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
};

const normalizeKey = (key: string) =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export type AliasMap = Record<string, string[]>;

const mapHeaderToField = (header: string, aliases: AliasMap): string | null => {
  const key = normalizeKey(header);
  for (const field of Object.keys(aliases)) {
    if (aliases[field].includes(key)) return field;
  }
  return null;
};

/**
 * Turn CSV/JSON text into raw rows keyed by canonical field name, using the
 * supplied alias map. `jsonKeys` lists the object wrappers a JSON payload may
 * use around its array (e.g. ["inventoryItems", "items"]).
 */
export function tabularToRawRows<R extends Record<string, unknown>>(
  text: string,
  format: "csv" | "json",
  aliases: AliasMap,
  jsonKeys: string[] = [],
): R[] {
  if (format === "json") {
    const parsed = JSON.parse(text);
    let list: unknown[] | null = Array.isArray(parsed) ? parsed : null;
    if (!list) {
      for (const k of jsonKeys) {
        if (Array.isArray((parsed as Record<string, unknown>)?.[k])) {
          list = (parsed as Record<string, unknown[]>)[k];
          break;
        }
      }
    }
    if (!list) {
      throw new Error(
        "JSON must be an array of records (or an object wrapping one).",
      );
    }
    return list.map((entry) => {
      const raw: Record<string, unknown> = {};
      for (const key of Object.keys((entry as object) || {})) {
        const field = mapHeaderToField(key, aliases);
        if (field) raw[field] = (entry as Record<string, unknown>)[key];
      }
      return raw as R;
    });
  }

  const matrix = parseCsv(text);
  if (matrix.length === 0) return [];
  const [headerRow, ...dataRows] = matrix;
  const fieldByIndex = headerRow.map((h) => mapHeaderToField(h, aliases));

  return dataRows.map((cells) => {
    const raw: Record<string, unknown> = {};
    fieldByIndex.forEach((field, idx) => {
      if (field) raw[field] = cells[idx];
    });
    return raw as R;
  });
}
