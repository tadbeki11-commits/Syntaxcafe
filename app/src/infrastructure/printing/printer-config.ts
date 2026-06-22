export const PRINTER_STORAGE_KEY = 'app_selected_printer';
export const PRINTER_DEPARTMENT_STORAGE_KEY = 'app_printer_department_map';
export const PRINT_COPIES_STORAGE_KEY = 'cashier_print_copies';

/**
 * A single ticket destination for a department. A department with no stations
 * prints exactly one ticket to its primary `printer` (the original behaviour).
 * A department with stations fans out: one ticket per station, each to its own
 * printer, all carrying the same order number.
 *
 * Example — an Ethiopian butchery (ሥጋ ቤት) department routes to:
 *   [{ label: 'BUTCHER', showPrices: false },
 *    { label: 'KITCHEN', showPrices: false },
 *    { label: 'CUSTOMER COPY', showPrices: true }]
 */
export interface DepartmentStation {
  id: string;
  label: string;
  printer: string;
  copies: number;
  showPrices: boolean;
}

export interface DepartmentPrintConfig {
  /** Primary printer — used when `stations` is empty, and as a fallback. */
  printer: string;
  /** Ordered ticket destinations. Empty = single ticket to `printer`. */
  stations: DepartmentStation[];
}

function normalizeDepartment(value: string) {
  return String(value || '').trim().toLowerCase();
}

export function createStationId(): string {
  return `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function coerceStation(raw: unknown): DepartmentStation | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const printer = String(r.printer || '').trim();
  const label = String(r.label || '').trim();
  if (!printer && !label) return null;

  const copies = Number(r.copies);
  return {
    id: String(r.id || '').trim() || createStationId(),
    label,
    printer,
    copies: Number.isFinite(copies) && copies > 0 ? Math.floor(copies) : 1,
    showPrices: Boolean(r.showPrices),
  };
}

/**
 * Accepts both the legacy format (a bare printer name string) and the current
 * object format, so existing department→printer maps keep working after upgrade.
 */
function coerceConfig(raw: unknown): DepartmentPrintConfig {
  if (typeof raw === 'string') {
    return { printer: raw.trim(), stations: [] };
  }
  const r = (raw ?? {}) as Record<string, unknown>;
  const printer = String(r.printer || '').trim();
  const stations = Array.isArray(r.stations)
    ? (r.stations.map(coerceStation).filter(Boolean) as DepartmentStation[])
    : [];
  return { printer, stations };
}

export function getDepartmentConfigMap(): Record<string, DepartmentPrintConfig> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage?.getItem(PRINTER_DEPARTMENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, DepartmentPrintConfig>>(
      (acc, [dept, value]) => {
        const normalizedDept = normalizeDepartment(dept);
        if (!normalizedDept) return acc;
        const config = coerceConfig(value);
        // Keep a department only if it has something actionable.
        if (config.printer || config.stations.length > 0) {
          acc[normalizedDept] = config;
        }
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writeDepartmentConfigMap(map: Record<string, DepartmentPrintConfig>) {
  if (typeof window === 'undefined') return;
  window.localStorage?.setItem(PRINTER_DEPARTMENT_STORAGE_KEY, JSON.stringify(map));
}

/**
 * Replace the entire local config map — used to hydrate this device from the
 * branch config stored on the backend. Values are coerced through the same
 * normalizer as a fresh read, so a backend blob in either format is accepted.
 */
export function replaceDepartmentConfigMap(map: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const normalized = Object.entries(map || {}).reduce<Record<string, DepartmentPrintConfig>>(
    (acc, [dept, value]) => {
      const slug = normalizeDepartment(dept);
      if (!slug) return acc;
      const config = coerceConfig(value);
      if (config.printer || config.stations.length > 0) acc[slug] = config;
      return acc;
    },
    {},
  );
  writeDepartmentConfigMap(normalized);
}

export function getDepartmentConfig(department: string): DepartmentPrintConfig {
  const normalizedDepartment = normalizeDepartment(department);
  return getDepartmentConfigMap()[normalizedDepartment] || { printer: '', stations: [] };
}

export function getDepartmentStations(department: string): DepartmentStation[] {
  return getDepartmentConfig(department).stations;
}

export function setDepartmentConfig(department: string, config: DepartmentPrintConfig) {
  const normalizedDepartment = normalizeDepartment(department);
  if (!normalizedDepartment) return;

  const map = getDepartmentConfigMap();
  const next: DepartmentPrintConfig = {
    printer: String(config?.printer || '').trim(),
    stations: Array.isArray(config?.stations)
      ? (config.stations.map(coerceStation).filter(Boolean) as DepartmentStation[])
      : [],
  };

  if (!next.printer && next.stations.length === 0) {
    delete map[normalizedDepartment];
  } else {
    map[normalizedDepartment] = next;
  }
  writeDepartmentConfigMap(map);
}

/**
 * Legacy view of the config: department slug → primary printer name. Preserved
 * for callers that only care about the single-printer assignment.
 */
export function getPrinterDepartmentMap(): Record<string, string> {
  return Object.entries(getDepartmentConfigMap()).reduce<Record<string, string>>(
    (acc, [dept, config]) => {
      if (config.printer) acc[dept] = config.printer;
      return acc;
    },
    {},
  );
}

/**
 * Assign a single printer to a department (preserving any advanced stations).
 * Mirrors the original semantics: a printer serves one department at a time, so
 * reassigning it moves it off whatever department previously used it.
 */
export function setPrinterDepartment(department: string, printerName: string) {
  const normalizedDepartment = normalizeDepartment(department);
  const selectedPrinter = String(printerName || '').trim();
  const map = getDepartmentConfigMap();

  if (selectedPrinter) {
    Object.entries(map).forEach(([dept, config]) => {
      if (dept !== normalizedDepartment && config.printer === selectedPrinter) {
        map[dept] = { ...config, printer: '' };
        if (!map[dept].printer && map[dept].stations.length === 0) delete map[dept];
      }
    });
  }

  if (normalizedDepartment) {
    const existing = map[normalizedDepartment] || { printer: '', stations: [] };
    const updated = { ...existing, printer: selectedPrinter };
    if (!updated.printer && updated.stations.length === 0) {
      delete map[normalizedDepartment];
    } else {
      map[normalizedDepartment] = updated;
    }
  }

  writeDepartmentConfigMap(map);
}

export function getActivePrinterName(): string {
  const mappedPrinter = Object.values(getPrinterDepartmentMap()).find(Boolean);
  if (mappedPrinter) {
    return mappedPrinter;
  }

  return (
    localStorage.getItem(PRINTER_STORAGE_KEY) ||
    String(import.meta.env.VITE_PRINTER_NAME || '').trim()
  );
}

export function getPrinterForDepartment(department: string): string {
  const mappedPrinter = getDepartmentConfig(department).printer;
  return mappedPrinter || getActivePrinterName();
}

export function getPrintCopies(): number {
  const raw = localStorage.getItem(PRINT_COPIES_STORAGE_KEY);
  const n = parseInt(raw || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
