export const PRINTER_STORAGE_KEY = 'app_selected_printer';
export const PRINTER_DEPARTMENT_STORAGE_KEY = 'app_printer_department_map';
export const PRINT_COPIES_STORAGE_KEY = 'cashier_print_copies';

function normalizeDepartment(value: string) {
  return String(value || '').trim().toLowerCase();
}

export function getPrinterDepartmentMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage?.getItem(PRINTER_DEPARTMENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [dept, printer]) => {
      const normalizedDept = normalizeDepartment(dept);
      const printerName = String(printer || '').trim();
      if (normalizedDept && printerName) {
        acc[normalizedDept] = printerName;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function setPrinterDepartment(department: string, printerName: string) {
  if (typeof window === 'undefined') return;

  const normalizedDepartment = normalizeDepartment(department);
  const selectedPrinter = String(printerName || '').trim();
  const nextMap = getPrinterDepartmentMap();

  Object.keys(nextMap).forEach((dept) => {
    if (dept === normalizedDepartment || nextMap[dept] === selectedPrinter) {
      delete nextMap[dept];
    }
  });

  if (normalizedDepartment && selectedPrinter) {
    nextMap[normalizedDepartment] = selectedPrinter;
  }

  window.localStorage?.setItem(PRINTER_DEPARTMENT_STORAGE_KEY, JSON.stringify(nextMap));
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
  const normalizedDepartment = normalizeDepartment(department);
  const mappedPrinter = getPrinterDepartmentMap()[normalizedDepartment];
  return mappedPrinter || getActivePrinterName();
}

export function getPrintCopies(): number {
  const raw = localStorage.getItem(PRINT_COPIES_STORAGE_KEY);
  const n = parseInt(raw || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
