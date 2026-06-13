import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/application';
import {
  Printer,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  Zap,
  Circle,
  Settings2,
  AlertTriangle,
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown } from 'lucide-react';
import BranchBadge from '@/components/common/BranchBadge';

import {
  PRINTER_STORAGE_KEY,
  PRINTER_DEPARTMENT_STORAGE_KEY,
  PRINT_COPIES_STORAGE_KEY,
  getPrinterDepartmentMap,
  setPrinterDepartment,
  getActivePrinterName,
  getPrinterForDepartment,
  getPrintCopies,
} from '@/infrastructure/printing/printer-config';
import { getApproximateServerDate } from '@/shared/utils/serverTime';

export {
  PRINTER_STORAGE_KEY,
  PRINTER_DEPARTMENT_STORAGE_KEY,
  PRINT_COPIES_STORAGE_KEY,
  getPrinterDepartmentMap,
  setPrinterDepartment,
  getActivePrinterName,
  getPrinterForDepartment,
  getPrintCopies,
};

function normalizeDepartment(value: string) {
  return String(value || '').trim().toLowerCase();
}

interface DepartmentOption {
  name: string;
  slug: string;
}

function normalizeDepartmentOption(department: any): DepartmentOption | null {
  const slug = normalizeDepartment(department?.slug || department?.name || '');
  const name = String(department?.name || slug || '').trim().replace(/_/g, ' ');

  if (!slug || !name) return null;

  return { name, slug };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PrinterInfo {
  name: string;
  interface_type?: string;
  identifier?: string;
  status?: string;
}

// ─── Status badge helpers ─────────────────────────────────────────────────────
function statusColor(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'idle':    return 'bg-success';
    case 'printing': return 'bg-info';
    case 'disabled': return 'bg-destructive';
    default:        return 'bg-warning';
  }
}
function statusLabel(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'idle') return 'Idle';
  if (s === 'printing') return 'Printing';
  if (s === 'disabled') return 'Disabled';
  return 'Unknown';
}

// ─── Component ────────────────────────────────────────────────────────────────
const PrinterSettings: React.FC = () => {
  const navigate = useNavigate();

  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [printerAssignments, setPrinterAssignments] = useState<Record<string, string>>(getPrinterDepartmentMap());
  const [printCopies, setPrintCopies] = useState<number>(getPrintCopies());

  // ── Load printers ──────────────────────────────────────────────────────────
  const loadPrinters = useCallback(async () => {
    setLoading(true);
    try {
      const { list_thermal_printers } = await import('tauri-plugin-thermal-printer');
      const raw = (await list_thermal_printers()) as any[];
      const parsed: PrinterInfo[] = raw.map((p: any) =>
        typeof p === 'string' ? { name: p } : {
          name: p.name || p.printer || '',
          interface_type: p.interface_type,
          identifier: p.identifier,
          status: p.status
        }
      );
      setPrinters(parsed);
    } catch (err: any) {
      console.error('[PrinterSettings] Failed to list printers:', err);
      toast.error(`Failed to list printers: ${typeof err === 'string' ? err : (err?.message || String(err))}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const response = await api.menu.getMainCategories({ is_active: true });
      const payload = (response as any)?.data;
      const departments =
        payload?.data?.mainCategories ||
        payload?.mainCategories ||
        payload?.data ||
        [];

      setAvailableDepartments(
        Array.isArray(departments)
          ? departments.map(normalizeDepartmentOption).filter(Boolean) as DepartmentOption[]
          : [],
      );
    } catch (err) {
      console.error('[PrinterSettings] Failed to load departments:', err);
      setAvailableDepartments([]);
    }
  }, []);

  useEffect(() => {
    loadPrinters();
    loadDepartments();
  }, [loadDepartments, loadPrinters]);

  // ── Save selection ─────────────────────────────────────────────────────────
  // One printer can serve multiple departments; each department maps to a single printer.
  const handleToggleDepartment = (printerName: string, departmentSlug: string, checked: boolean) => {
    const departmentLabel =
      availableDepartments.find((entry) => entry.slug === departmentSlug)?.name || departmentSlug;

    setPrinterAssignments((current) => {
      const next: Record<string, string> = { ...current };

      if (checked) {
        // Assign this department to this printer (reassigns it from any other printer).
        next[departmentSlug] = printerName;
      } else if (next[departmentSlug] === printerName) {
        delete next[departmentSlug];
      }

      localStorage.setItem(PRINTER_DEPARTMENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    if (checked) {
      toast.success(`🖨️ ${printerName} now prints ${departmentLabel} receipts`, { duration: 3000 });
    } else {
      toast.success(`🖨️ ${printerName} no longer prints ${departmentLabel} receipts`, { duration: 3000 });
    }
  };

  const assignedDepartments = Object.entries(printerAssignments);
  const assignedPrinterCount = new Set(Object.values(printerAssignments)).size;

  // ── Test print ─────────────────────────────────────────────────────────────
  const handleTestPrint = async (printerName: string) => {
    setTestingPrinter(printerName);
    try {
      const { print_thermal_printer } = await import('tauri-plugin-thermal-printer');

      const sections: any[] = [
        { Title: { text: 'PRINTER TEST' } },
        { Text: { text: `Printer: ${printerName}`, align: 'Center' } },
        { Text: { text: '--------------------------------', align: 'Center' } },
        {
          Table: {
            columns: 2,
            column_widths: [36, 12],
            truncate: true,
            header: [{ text: 'Item' }, { text: 'Status' }],
            body: [
              [{ text: 'Connection' }, { text: 'OK ✓' }],
              [{ text: 'Paper Feed' }, { text: 'OK ✓' }],
              [{ text: 'Cut Mode'   }, { text: 'Partial' }],
            ]
          }
        },
        { Text: { text: '--------------------------------', align: 'Center' } },
        { Text: { text: `\n${getApproximateServerDate().toLocaleString()}\n`, align: 'Center' } },
        { Feed: { feed_type: 'lines', value: 3 } },
        { Cut: { mode: 'partial', feed: 0 } },
      ];

      await print_thermal_printer({
        printer: printerName,
        paper_size: 'Mm80',
        options: { code_page: 6, encode: 'WINDOWS_1252' },
        sections,
      } as any);

      toast.success(`Test print sent to "${printerName}" ✓`, { duration: 3000 });
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : (err?.message || String(err));
      toast.error(`Test print failed: ${msg}`, { duration: 5000 });
    } finally {
      setTestingPrinter(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">

      {/* ── Header ── */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-foreground">Printer Settings</h1>
                  <BranchBadge />
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5">
                  <Settings2 className="w-3 h-3" />
                  Select and test your thermal receipt printer
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold"
              onClick={loadPrinters}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Active Printer Banner ── */}
      <Card className={`border-2 shadow-sm transition-colors ${assignedPrinterCount > 0 ? 'border-green-500/40 bg-success/5' : 'border-yellow-500/40 bg-warning/5'}`}>
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${assignedPrinterCount > 0 ? 'bg-success/15' : 'bg-warning/15'}`}>
              <Printer className={`w-5 h-5 ${assignedPrinterCount > 0 ? 'text-success' : 'text-warning'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Department Routing</p>
              {assignedDepartments.length > 0 ? (
                <p className="font-bold text-foreground truncate">
                  {assignedDepartments.length} department{assignedDepartments.length !== 1 ? 's' : ''} mapped to {assignedPrinterCount} printer{assignedPrinterCount !== 1 ? 's' : ''}
                </p>
              ) : (
                <p className="font-semibold text-warning flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  No departments mapped yet — using the system default printer
                </p>
              )}
            </div>
            {assignedDepartments.length > 0 && (
              <Badge className="bg-success/15 text-success border-green-500/30 font-bold text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Routing active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Printer List ── */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            Available Printers
          </CardTitle>
          <CardDescription className="text-xs">
            {loading
              ? 'Scanning for printers via CUPS…'
              : printers.length === 0
                ? 'No printers detected. Make sure CUPS is running and printers are configured.'
                : `${printers.length} printer${printers.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-5 pb-5 space-y-3">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && printers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="p-4 rounded-2xl bg-muted/40">
                <Printer className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No printers found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Ensure CUPS is running and your thermal printer is connected and configured.
                  <br />Run <code className="bg-muted px-1 rounded text-[10px]">lpstat -p</code> to verify.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadPrinters} className="mt-2">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
              </Button>
            </div>
          )}

          {!loading && printers.map((printer) => {
            const isTesting = testingPrinter === printer.name;
            const assignedSlugs = Object.entries(printerAssignments)
              .filter(([, assignedPrinter]) => assignedPrinter === printer.name)
              .map(([dept]) => dept);
            const assignedDepartmentOptions = assignedSlugs.map(
              (slug) => availableDepartments.find((dept) => dept.slug === slug) || { name: slug, slug },
            );
            const hasAssignment = assignedSlugs.length > 0;

            return (
              <div
                key={printer.name}
                className={`
                  relative rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer group
                  ${hasAssignment
                    ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                    : 'border-border/50 hover:border-primary/40 hover:bg-accent/30'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Status dot */}
                  <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${statusColor(printer.status)}`} />

                  {/* Printer details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground truncate">
                        {printer.name}
                      </span>
                      {assignedDepartmentOptions.map((dept) => (
                        <Badge key={dept.slug} className="bg-primary/15 text-primary border-primary/30 font-bold text-[10px] px-1.5 py-0">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                          {dept.name}
                        </Badge>
                      ))}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-1.5 py-0 border-none ${
                          (printer.status || '').toLowerCase() === 'idle'
                            ? 'bg-success/10 text-success'
                            : (printer.status || '').toLowerCase() === 'printing'
                              ? 'bg-info/10 text-info'
                              : (printer.status || '').toLowerCase() === 'disabled'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-warning/10 text-warning'
                        }`}
                      >
                        <Circle className="w-1.5 h-1.5 mr-1 fill-current" />
                        {statusLabel(printer.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {printer.interface_type && (
                        <span className="text-[11px] text-muted-foreground">
                          <span className="font-medium">Interface:</span> {printer.interface_type}
                        </span>
                      )}
                      {printer.identifier && (
                        <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                          <span className="font-medium">ID:</span> {printer.identifier}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 max-w-xs" onClick={(e) => e.stopPropagation()}>
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Departments
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="mt-1 h-9 w-full justify-between text-xs font-medium"
                          >
                            <span className="truncate">
                              {assignedDepartmentOptions.length > 0
                                ? assignedDepartmentOptions.map((dept) => dept.name).join(', ')
                                : 'Assign departments'}
                            </span>
                            <ChevronsUpDown className="w-3.5 h-3.5 ml-1.5 shrink-0 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-64 p-2">
                          {availableDepartments.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto space-y-0.5">
                              {availableDepartments.map((dept) => {
                                const checked = printerAssignments[dept.slug] === printer.name;
                                const assignedElsewhere =
                                  !checked && Boolean(printerAssignments[dept.slug]);
                                return (
                                  <label
                                    key={dept.slug}
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(value) =>
                                        handleToggleDepartment(printer.name, dept.slug, value === true)
                                      }
                                    />
                                    <span className="flex-1 truncate">{dept.name}</span>
                                    {assignedElsewhere && (
                                      <span className="text-[9px] text-muted-foreground italic">
                                        moves here
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                              No departments found in the database
                            </p>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] font-bold px-2.5"
                      disabled={isTesting}
                      onClick={() => handleTestPrint(printer.name)}
                    >
                      {isTesting ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Zap className="w-3 h-3 mr-1" />
                      )}
                      {isTesting ? 'Printing…' : 'Test'}
                    </Button>

                    <Badge variant="outline" className="h-8 px-2.5 text-[11px] font-bold border-dashed">
                      <Printer className="w-3 h-3 mr-1" />
                      {hasAssignment
                        ? `Prints ${assignedDepartmentOptions.map((dept) => dept.name).join(', ')}`
                        : 'Not assigned'}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Help card ── */}
      <Card className="border-border/40 bg-muted/20 shadow-none">
        <CardContent className="py-4 px-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">How it works:</span>{' '}
            Printers are discovered via CUPS (<code className="bg-muted px-1 rounded">lpstat</code>).
            Assign a printer to a department, then orders with that department will print only on that printer.
            If a department is unassigned, the system falls back to the configured active printer, then the <code className="bg-muted px-1 rounded">VITE_PRINTER_NAME</code> environment variable.
          </p>
        </CardContent>
      </Card>

      {/* ── Order Print Copies ── */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-base font-bold">Order Print Copies</CardTitle>
          <CardDescription className="text-xs">
            Number of physical copies to print each time an order is completed or payment received
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label htmlFor="print_copies" className="text-xs font-semibold text-muted-foreground">Copies per order</Label>
              <Input
                id="print_copies"
                type="number"
                min={1}
                max={10}
                value={printCopies}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(10, parseInt(e.target.value || '1', 10)));
                  setPrintCopies(val);
                  localStorage.setItem(PRINT_COPIES_STORAGE_KEY, String(val));
                }}
                className="mt-1 h-9"
              />
            </div>
            <Button
              variant="default"
              size="sm"
              className="h-9 text-xs font-bold mt-4"
              onClick={async () => {
                try {
                  await api.settings.updatePrintCopies(printCopies);
                  toast.success(`Print copies set to ${printCopies}`);
                } catch {
                  toast.error('Failed to save to server. Changes saved locally.');
                }
              }}
            >
              Save
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-1">
            Each time the system prints an order ticket, it will produce exactly this many copies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterSettings;
