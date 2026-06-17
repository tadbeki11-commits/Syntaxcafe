// Parsing + validation for the bulk menu importer (CSV / JSON).
// Pure functions — no React or DOM deps so they're easy to test.

export const slugify = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

export interface ParsedMenuRow {
  /** 1-based row number from the source (header excluded) for error messages. */
  rowNumber: number;
  name: string;
  description: string;
  /** Price in whole birr (integer). */
  price: number;
  category: string;
  main_category: string;
  tags: string[];
  is_available: boolean;
  prep_time_minutes: number;
  sku: string;
  barcode: string;
  errors: string[];
  warnings: string[];
}

type RawRow = {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  main_category?: unknown;
  tags?: unknown;
  is_available?: unknown;
  prep_time_minutes?: unknown;
  sku?: unknown;
  barcode?: unknown;
};

/** Columns we understand. The first matching alias wins. */
const COLUMN_ALIASES: Record<keyof RawRow, string[]> = {
  name: ["name", "item", "item_name", "title"],
  description: ["description", "desc", "details"],
  price: ["price", "amount", "birr", "price_birr"],
  category: ["category", "sub_category", "subcategory"],
  main_category: ["main_category", "department", "printing_dept", "dept", "section"],
  tags: ["tags", "labels", "extra_categories"],
  is_available: ["is_available", "available", "active", "enabled"],
  prep_time_minutes: ["prep_time_minutes", "prep_time", "prep", "prep_minutes"],
  sku: ["sku", "code", "item_code"],
  barcode: ["barcode", "ean", "upc"],
};

export const TEMPLATE_HEADERS = [
  "name",
  "price",
  "category",
  "main_category",
  "tags",
  "description",
  "is_available",
  "prep_time_minutes",
  "sku",
  "barcode",
] as const;

export const CSV_TEMPLATE = [
  TEMPLATE_HEADERS.join(","),
  `Macchiato,80,Hot Drinks,barista,Popular;Coffee,"Rich espresso with milk",true,5,MAC-01,`,
  `Cheesecake,150,Desserts,kitchen,Sweet,Classic baked cheesecake,true,0,CKE-02,`,
].join("\n");

export const JSON_TEMPLATE = JSON.stringify(
  [
    {
      name: "Macchiato",
      price: 80,
      category: "Hot Drinks",
      main_category: "barista",
      tags: ["Popular", "Coffee"],
      description: "Rich espresso with milk",
      is_available: true,
      prep_time_minutes: 5,
      sku: "MAC-01",
      barcode: "",
    },
    {
      name: "Cheesecake",
      price: 150,
      category: "Desserts",
      main_category: "kitchen",
      tags: ["Sweet"],
      description: "Classic baked cheesecake",
      is_available: true,
    },
  ],
  null,
  2,
);

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

const mapHeaderToField = (header: string): keyof RawRow | null => {
  const key = normalizeKey(header);
  for (const field of Object.keys(COLUMN_ALIASES) as Array<keyof RawRow>) {
    if (COLUMN_ALIASES[field].includes(key)) return field;
  }
  return null;
};

const csvToRawRows = (text: string): RawRow[] => {
  const matrix = parseCsv(text);
  if (matrix.length === 0) return [];
  const [headerRow, ...dataRows] = matrix;
  const fieldByIndex = headerRow.map((h) => mapHeaderToField(h));

  return dataRows.map((cells) => {
    const raw: RawRow = {};
    fieldByIndex.forEach((field, idx) => {
      if (field) (raw as Record<string, unknown>)[field] = cells[idx];
    });
    return raw;
  });
};

const jsonToRawRows = (text: string): RawRow[] => {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.menuItems)
      ? parsed.menuItems
      : Array.isArray(parsed?.items)
        ? parsed.items
        : null;
  if (!list) {
    throw new Error(
      "JSON must be an array of items (or an object with a menuItems array).",
    );
  }
  return list.map((entry: Record<string, unknown>) => {
    const raw: RawRow = {};
    for (const key of Object.keys(entry || {})) {
      const field = mapHeaderToField(key);
      if (field) (raw as Record<string, unknown>)[field] = entry[key];
    }
    return raw;
  });
};

// ── Value coercion ──
const toBool = (value: unknown, fallback = true): boolean => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "available"].includes(s)) return true;
  if (["false", "0", "no", "n", "unavailable"].includes(s)) return false;
  return fallback;
};

const toTags = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((t) => String(t).trim()).filter(Boolean);
  if (value === undefined || value === null) return [];
  return String(value)
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter(Boolean);
};

const str = (value: unknown) =>
  value === undefined || value === null ? "" : String(value).trim();

export interface ValidationContext {
  /** Slugs of known main categories so we can warn about unknown departments. */
  knownMainCategorySlugs: Set<string>;
  /** Lowercased names of items that already exist, to flag duplicates. */
  existingNames: Set<string>;
}

const normalizeRow = (
  raw: RawRow,
  rowNumber: number,
  ctx: ValidationContext,
  seenNames: Set<string>,
): ParsedMenuRow => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = str(raw.name);
  if (!name) errors.push("Name is required");

  const priceRaw = str(raw.price);
  let price = 0;
  if (priceRaw === "") {
    errors.push("Price is required");
  } else {
    const parsed = Number(priceRaw.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.push(`Invalid price "${priceRaw}"`);
    } else {
      price = Math.round(parsed);
    }
  }

  const category = str(raw.category) || "cafe";
  const mainCategory = slugify(str(raw.main_category)) || "barista";
  if (str(raw.main_category) && !ctx.knownMainCategorySlugs.has(mainCategory)) {
    warnings.push(`Unknown category "${mainCategory}" — it will be saved as-is`);
  }

  const tags = toTags(raw.tags);
  const isAvailable = toBool(raw.is_available, true);

  const prepRaw = str(raw.prep_time_minutes);
  let prep = 0;
  if (prepRaw) {
    const p = Number(prepRaw.replace(/[^\d]/g, ""));
    if (Number.isFinite(p) && p >= 0) prep = p;
  }

  const lowerName = name.toLowerCase();
  if (lowerName) {
    if (seenNames.has(lowerName)) {
      warnings.push("Duplicate name within this file");
    } else if (ctx.existingNames.has(lowerName)) {
      warnings.push("An item with this name already exists");
    }
    seenNames.add(lowerName);
  }

  return {
    rowNumber,
    name,
    description: str(raw.description),
    price,
    category,
    main_category: mainCategory,
    tags,
    is_available: isAvailable,
    prep_time_minutes: prep,
    sku: str(raw.sku),
    barcode: str(raw.barcode),
    errors,
    warnings,
  };
};

export interface ParseResult {
  rows: ParsedMenuRow[];
  /** A file-level fatal error (e.g. malformed JSON). When set, rows is empty. */
  fatalError?: string;
}

export const parseMenuFile = (
  text: string,
  format: "csv" | "json",
  ctx: ValidationContext,
): ParseResult => {
  let rawRows: RawRow[];
  try {
    rawRows = format === "json" ? jsonToRawRows(text) : csvToRawRows(text);
  } catch (e) {
    return {
      rows: [],
      fatalError: e instanceof Error ? e.message : "Failed to parse file",
    };
  }

  if (rawRows.length === 0) {
    return { rows: [], fatalError: "No data rows found in the file" };
  }

  const seenNames = new Set<string>();
  const rows = rawRows.map((raw, idx) => normalizeRow(raw, idx + 1, ctx, seenNames));
  return { rows };
};

/** Convert a validated row into the payload shape expected by /menu/sync. */
export const rowToMenuItemPayload = (row: ParsedMenuRow) => ({
  name: row.name,
  description: row.description || null,
  price: row.price,
  category: row.category,
  main_category: row.main_category,
  type: "cafe",
  is_available: row.is_available,
  prep_time_minutes: row.prep_time_minutes,
  sku: row.sku || null,
  barcode: row.barcode || null,
  categories: [
    { name: row.category, slug: slugify(row.category), type: "main" },
    ...row.tags.map((tag) => ({ name: tag, slug: slugify(tag), type: "tag" })),
  ],
});
