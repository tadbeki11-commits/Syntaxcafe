// Parsing + validation for the bulk inventory importer (CSV / JSON).
// Pure functions — no React/DOM deps.

import { AliasMap, str, tabularToRawRows, toNumber } from "./bulk-import";

export interface ParsedInventoryRow {
  rowNumber: number;
  name: string;
  unit: string;
  base_unit: string;
  pieces_per_unit: number;
  min_quantity: number;
  quantity: number | null;
  /** Location name as written in the file (resolved to an id at payload time). */
  location: string;
  /** Resolved location id, when `location` matched a known stock location. */
  location_id: string | null;
  notes: string;
  errors: string[];
  warnings: string[];
}

type RawRow = {
  name?: unknown;
  unit?: unknown;
  base_unit?: unknown;
  pieces_per_unit?: unknown;
  min_quantity?: unknown;
  quantity?: unknown;
  location?: unknown;
  notes?: unknown;
};

const COLUMN_ALIASES: AliasMap = {
  name: ["name", "item", "item_name", "title", "ingredient"],
  unit: ["unit", "purchase_unit", "pack_unit"],
  base_unit: ["base_unit", "stock_unit", "consume_unit"],
  pieces_per_unit: ["pieces_per_unit", "pieces", "per_unit", "conversion"],
  min_quantity: ["min_quantity", "min", "reorder_level", "min_stock"],
  quantity: ["quantity", "qty", "stock", "opening_stock", "on_hand"],
  location: ["location", "store", "warehouse", "stock_location"],
  notes: ["notes", "note", "description", "remark"],
};

const TEMPLATE_HEADERS = [
  "name",
  "unit",
  "base_unit",
  "pieces_per_unit",
  "min_quantity",
  "quantity",
  "location",
  "notes",
] as const;

export const CSV_TEMPLATE = [
  TEMPLATE_HEADERS.join(","),
  `Espresso Beans,kg,g,1000,2,10,Main Store,Arabica blend`,
  `Milk,liter,ml,1000,5,24,,Whole milk`,
].join("\n");

export const JSON_TEMPLATE = JSON.stringify(
  [
    {
      name: "Espresso Beans",
      unit: "kg",
      base_unit: "g",
      pieces_per_unit: 1000,
      min_quantity: 2,
      quantity: 10,
      location: "Main Store",
      notes: "Arabica blend",
    },
    {
      name: "Milk",
      unit: "liter",
      base_unit: "ml",
      pieces_per_unit: 1000,
      min_quantity: 5,
      quantity: 24,
    },
  ],
  null,
  2,
);

export interface InventoryValidationContext {
  /** Lowercased name → location id, for resolving the `location` column. */
  locationsByName: Map<string, string>;
  /** Lowercased names of items that already exist, to flag duplicates. */
  existingNames: Set<string>;
}

const normalizeRow = (
  raw: RawRow,
  rowNumber: number,
  ctx: InventoryValidationContext,
  seenNames: Set<string>,
): ParsedInventoryRow => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = str(raw.name);
  if (!name) errors.push("Name is required");

  const unit = str(raw.unit) || "piece";
  const base_unit = str(raw.base_unit) || unit;

  let pieces_per_unit = 1;
  const piecesRaw = toNumber(raw.pieces_per_unit);
  if (piecesRaw !== null) {
    if (piecesRaw < 1) warnings.push("pieces_per_unit < 1 — using 1");
    pieces_per_unit = Math.max(1, Math.round(piecesRaw));
  }

  let min_quantity = 0;
  const minRaw = toNumber(raw.min_quantity);
  if (minRaw !== null) {
    if (minRaw < 0) errors.push(`Invalid min_quantity "${str(raw.min_quantity)}"`);
    else min_quantity = Math.round(minRaw);
  }

  let quantity: number | null = null;
  const qtyRaw = toNumber(raw.quantity);
  if (str(raw.quantity) !== "") {
    if (qtyRaw === null || qtyRaw < 0)
      errors.push(`Invalid quantity "${str(raw.quantity)}"`);
    else quantity = Math.round(qtyRaw);
  }

  const location = str(raw.location);
  let location_id: string | null = null;
  if (location) {
    location_id = ctx.locationsByName.get(location.toLowerCase()) ?? null;
    if (!location_id) {
      warnings.push(
        `Unknown location "${location}" — stock goes to the default location`,
      );
    }
  }

  const lowerName = name.toLowerCase();
  if (lowerName) {
    if (seenNames.has(lowerName)) {
      warnings.push("Duplicate name within this file");
    } else if (ctx.existingNames.has(lowerName)) {
      warnings.push("An item with this name already exists — it will be updated");
    }
    seenNames.add(lowerName);
  }

  return {
    rowNumber,
    name,
    unit,
    base_unit,
    pieces_per_unit,
    min_quantity,
    quantity,
    location,
    location_id,
    notes: str(raw.notes),
    errors,
    warnings,
  };
};

export interface ParseResult {
  rows: ParsedInventoryRow[];
  fatalError?: string;
}

export const parseInventoryFile = (
  text: string,
  format: "csv" | "json",
  ctx: InventoryValidationContext,
): ParseResult => {
  let rawRows: RawRow[];
  try {
    rawRows = tabularToRawRows<RawRow>(text, format, COLUMN_ALIASES, [
      "inventoryItems",
      "items",
    ]);
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
  const rows = rawRows.map((raw, idx) =>
    normalizeRow(raw, idx + 1, ctx, seenNames),
  );
  return { rows };
};

/** Convert a validated row into the payload shape expected by /inventory/sync. */
export const rowToInventoryPayload = (row: ParsedInventoryRow) => {
  const payload: Record<string, unknown> = {
    name: row.name,
    unit: row.unit,
    base_unit: row.base_unit,
    pieces_per_unit: row.pieces_per_unit,
    min_quantity: row.min_quantity,
    min_quantity_mode: "global",
    notes: row.notes || null,
  };
  // A resolved location → stock_by_location; otherwise a flat quantity that the
  // backend places at the branch's default location.
  if (row.quantity !== null) {
    if (row.location_id) {
      payload.stock_by_location = [
        { location_id: row.location_id, quantity: row.quantity },
      ];
    } else {
      payload.quantity = row.quantity;
    }
  }
  return payload;
};
