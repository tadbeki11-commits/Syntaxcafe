// Parsing + validation for the bulk staff importer (CSV / JSON).
// Pure functions — no React/DOM deps.

import { AliasMap, str, tabularToRawRows, toBool } from "./bulk-import";

export const STAFF_ROLES = [
  "admin",
  "fb_manager",
  "cashier",
  "kitchen_staff",
  "cafe_waiter",
] as const;

export interface ParsedStaffRow {
  rowNumber: number;
  full_name: string;
  username: string;
  role: string;
  phone: string;
  password: string;
  pin: string;
  is_active: boolean;
  errors: string[];
  warnings: string[];
}

type RawRow = {
  full_name?: unknown;
  username?: unknown;
  role?: unknown;
  phone?: unknown;
  password?: unknown;
  pin?: unknown;
  is_active?: unknown;
};

const COLUMN_ALIASES: AliasMap = {
  full_name: ["full_name", "name", "fullname", "employee", "staff_name"],
  username: ["username", "user", "login", "user_name"],
  role: ["role", "position", "job"],
  phone: ["phone", "mobile", "tel", "contact"],
  password: ["password", "pass", "pwd"],
  pin: ["pin", "pin_code", "login_pin"],
  is_active: ["is_active", "active", "status", "enabled"],
};

const TEMPLATE_HEADERS = [
  "full_name",
  "username",
  "role",
  "phone",
  "password",
  "pin",
  "is_active",
] as const;

export const CSV_TEMPLATE = [
  TEMPLATE_HEADERS.join(","),
  `Sara Tesfaye,sara,cashier,0911000000,,1234,true`,
  `Abel Kebede,abel,kitchen_staff,0911222333,changeme,,true`,
].join("\n");

export const JSON_TEMPLATE = JSON.stringify(
  [
    {
      full_name: "Sara Tesfaye",
      username: "sara",
      role: "cashier",
      phone: "0911000000",
      pin: "1234",
      is_active: true,
    },
    {
      full_name: "Abel Kebede",
      username: "abel",
      role: "kitchen_staff",
      phone: "0911222333",
      password: "changeme",
      is_active: true,
    },
  ],
  null,
  2,
);

export interface StaffValidationContext {
  /** Lowercased usernames that already exist, to flag duplicates/updates. */
  existingUsernames: Set<string>;
}

const splitName = (full: string): { first: string; last: string } => {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
};

const normalizeRow = (
  raw: RawRow,
  rowNumber: number,
  ctx: StaffValidationContext,
  seenUsernames: Set<string>,
): ParsedStaffRow => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const full_name = str(raw.full_name);
  if (!full_name) errors.push("Full name is required");

  const username = str(raw.username);
  if (!username) errors.push("Username is required");

  const role = str(raw.role).toLowerCase() || "cashier";
  if (!STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) {
    warnings.push(`Unknown role "${role}" — it will be saved as-is`);
  }

  const pin = str(raw.pin);
  if (pin && !/^\d{4}$/.test(pin)) {
    errors.push("PIN must be exactly 4 digits");
  }

  const password = str(raw.password);
  if (!password && !pin) {
    warnings.push("No password/PIN — a default password will be set");
  }

  const lowerUser = username.toLowerCase();
  if (lowerUser) {
    if (seenUsernames.has(lowerUser)) {
      errors.push("Duplicate username within this file");
    } else if (ctx.existingUsernames.has(lowerUser)) {
      warnings.push("Username already exists — this account will be updated");
    }
    seenUsernames.add(lowerUser);
  }

  return {
    rowNumber,
    full_name,
    username,
    role,
    phone: str(raw.phone),
    password,
    pin,
    is_active: toBool(raw.is_active, true),
    errors,
    warnings,
  };
};

export interface ParseResult {
  rows: ParsedStaffRow[];
  fatalError?: string;
}

export const parseStaffFile = (
  text: string,
  format: "csv" | "json",
  ctx: StaffValidationContext,
): ParseResult => {
  let rawRows: RawRow[];
  try {
    rawRows = tabularToRawRows<RawRow>(text, format, COLUMN_ALIASES, [
      "users",
      "staff",
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

  const seenUsernames = new Set<string>();
  const rows = rawRows.map((raw, idx) =>
    normalizeRow(raw, idx + 1, ctx, seenUsernames),
  );
  return { rows };
};

/** Convert a validated row into the payload shape expected by /users/sync. */
export const rowToStaffPayload = (row: ParsedStaffRow) => {
  const { first, last } = splitName(row.full_name);
  return {
    username: row.username,
    name: row.full_name,
    first_name: first || null,
    last_name: last || null,
    role: row.role,
    phone: row.phone || null,
    is_active: row.is_active,
    ...(row.password ? { password: row.password } : {}),
    ...(row.pin ? { pin: row.pin } : {}),
  };
};
