import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Wifi,
  Plus,
  Trash2,
  ChevronDown,
  Layers,
  GripVertical
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
  getDepartmentConfigMap,
  setDepartmentConfig,
  replaceDepartmentConfigMap,
  createStationId,
  type DepartmentStation,
  type DepartmentPrintConfig,
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
  const [departmentConfigs, setDepartmentConfigs] = useState<Record<string, DepartmentPrintConfig>>(getDepartmentConfigMap());
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // Debounced push of the whole routing map to the branch backend. Local
  // storage is always written synchronously by the change handlers; this just
  // mirrors the result up so it persists across reinstalls and devices.
  const routingSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushRoutingToBackend = useCallback(() => {
    if (routingSyncTimer.current) clearTimeout(routingSyncTimer.current);
    routingSyncTimer.current = setTimeout(() => {
      api.settings.updatePrinterRoutingSettings(getDepartmentConfigMap()).catch(() => {
        /* best-effort — config is already saved locally */
      });
    }, 800);
  }, []);
  useEffect(() => () => {
    if (routingSyncTimer.current) clearTimeout(routingSyncTimer.current);
  }, []);

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

  // Pull the branch routing config from the backend. If the backend already has
  // a map, it wins and we mirror it into local storage. If it's empty (nothing
  // saved yet), we seed it from whatever this device has locally rather than
  // wiping a device that was configured before this synced to the backend.
  const loadRouting = useCallback(async () => {
    try {
      const map = await api.settings.getPrinterRoutingSettings();
      if (map && typeof map === 'object' && Object.keys(map).length > 0) {
        replaceDepartmentConfigMap(map);
        setDepartmentConfigs(getDepartmentConfigMap());
        setPrinterAssignments(getPrinterDepartmentMap());
      } else {
        const local = getDepartmentConfigMap();
        if (Object.keys(local).length > 0) {
          api.settings.updatePrinterRoutingSettings(local).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[PrinterSettings] Failed to load routing from backend:', err);
    }
  }, []);

  useEffect(() => {
    loadPrinters();
    loadDepartments();
    loadRouting();
  }, [loadDepartments, loadPrinters, loadRouting]);

  // ── Save selection ─────────────────────────────────────────────────────────
  // One printer can serve multiple departments; each department maps to a single
  // printer. Writes go through setPrinterDepartment so the department's advanced
  // station routing (if any) is preserved.
  const handleToggleDepartment = (printerName: string, departmentSlug: string, checked: boolean) => {
    const departmentLabel =
      availableDepartments.find((entry) => entry.slug === departmentSlug)?.name || departmentSlug;

    const current = printerAssignments[departmentSlug];
    setPrinterDepartment(departmentSlug, checked ? printerName : current === printerName ? '' : current || '');

    setPrinterAssignments(getPrinterDepartmentMap());
    setDepartmentConfigs(getDepartmentConfigMap());
    pushRoutingToBackend();

    if (checked) {
      toast.success(`🖨️ ${printerName} now prints ${departmentLabel} receipts`, { duration: 2000 });
    } else {
      toast.success(`🖨️ ${printerName} no longer prints ${departmentLabel} receipts`, { duration: 2000 });
    }
  };

  // ── Advanced station routing ─────────────────────────────────────────────────
  // A department can fan one order out to several stations (e.g. an Ethiopian
  // butchery: Butcher → Kitchen → Customer copy). Each station is its own ticket
  // to its own printer, all sharing the order number.
  const persistDepartmentConfig = (slug: string, config: DepartmentPrintConfig) => {
    setDepartmentConfig(slug, config);
    setDepartmentConfigs(getDepartmentConfigMap());
    setPrinterAssignments(getPrinterDepartmentMap());
    pushRoutingToBackend();
  };

  const getConfigFor = (slug: string): DepartmentPrintConfig =>
    departmentConfigs[slug] || { printer: '', stations: [] };

  const handleAddStation = (slug: string) => {
    const config = getConfigFor(slug);
    const station: DepartmentStation = {
      id: createStationId(),
      label: '',
      printer: printers[0]?.name || config.printer || '',
      copies: 1,
      showPrices: false,
    };
    persistDepartmentConfig(slug, { ...config, stations: [...config.stations, station] });
  };

  const handleUpdateStation = (slug: string, stationId: string, patch: Partial<DepartmentStation>) => {
    const config = getConfigFor(slug);
    persistDepartmentConfig(slug, {
      ...config,
      stations: config.stations.map((s) => (s.id === stationId ? { ...s, ...patch } : s)),
    });
  };

  const handleRemoveStation = (slug: string, stationId: string) => {
    const config = getConfigFor(slug);
    persistDepartmentConfig(slug, {
      ...config,
      stations: config.stations.filter((s) => s.id !== stationId),
    });
  };

  const handleApplyButcheryPreset = (slug: string) => {
    const config = getConfigFor(slug);
    const defaultPrinter = config.printer || printers[0]?.name || '';
    const stations: DepartmentStation[] = [
      { id: createStationId(), label: 'BUTCHER', printer: defaultPrinter, copies: 1, showPrices: false },
      { id: createStationId(), label: 'KITCHEN', printer: defaultPrinter, copies: 1, showPrices: false },
      { id: createStationId(), label: 'CUSTOMER COPY', printer: defaultPrinter, copies: 1, showPrices: true },
    ];
    persistDepartmentConfig(slug, { ...config, stations });
    toast.success('Butchery routing added — set a printer for each station', { duration: 2500 });
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

      toast.success(`Test print sent to "${printerName}" ✓`, { duration: 2000 });
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : (err?.message || String(err));
      toast.error(`Test print failed: ${msg}`, { duration: 2000 });
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
          </p>
        </CardContent>
      </Card>

      {/* ── Advanced Department Routing ── */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Advanced Department Routing
          </CardTitle>
          <CardDescription className="text-xs">
            Optional. Fan a department's order out to several stations — each its own ticket and printer,
            all sharing the order number. Built for butchery flows (Butcher → Kitchen → Customer copy).
            Leave a department untouched to keep its single-ticket behavior above.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-5 pb-5 space-y-2">
          {availableDepartments.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No departments found in the database.
            </p>
          )}

          {availableDepartments.map((dept) => {
            const config = departmentConfigs[dept.slug] || { printer: '', stations: [] };
            const stations = config.stations;
            const expanded = expandedDept === dept.slug;

            return (
              <div key={dept.slug} className="rounded-xl border-2 border-border/50 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedDept(expanded ? null : dept.slug)}
                >
                  <span className="font-bold text-sm text-foreground flex-1 truncate">{dept.name}</span>
                  {stations.length > 0 ? (
                    <Badge className="bg-primary/15 text-primary border-none text-[10px] font-bold">
                      {stations.length} station{stations.length !== 1 ? 's' : ''}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {config.printer ? 'Single ticket' : 'Not routed'}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>

                {expanded && (
                  <div className="border-t border-border/50 px-4 py-3 space-y-3 bg-muted/10">
                    {stations.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        This department prints one ticket to its assigned printer. Add stations to split it.
                      </p>
                    )}

                    {stations.map((station, idx) => (
                      <div
                        key={station.id}
                        className="rounded-lg border border-border/60 bg-background p-3 space-y-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                            Station {idx + 1}
                          </span>
                          <div className="flex-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveStation(dept.slug, station.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Ticket label
                            </Label>
                            <Input
                              value={station.label}
                              placeholder="e.g. BUTCHER"
                              onChange={(e) => handleUpdateStation(dept.slug, station.id, { label: e.target.value })}
                              className="mt-1 h-9 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Printer
                            </Label>
                            <select
                              value={station.printer}
                              onChange={(e) => handleUpdateStation(dept.slug, station.id, { printer: e.target.value })}
                              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                            >
                              <option value="">Select printer…</option>
                              {printers.map((p) => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                              ))}
                              {station.printer && !printers.some((p) => p.name === station.printer) && (
                                <option value={station.printer}>{station.printer} (offline)</option>
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Copies
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={station.copies}
                              onChange={(e) =>
                                handleUpdateStation(dept.slug, station.id, {
                                  copies: Math.max(1, Math.min(10, parseInt(e.target.value || '1', 10))),
                                })
                              }
                              className="h-8 w-16 text-xs"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                            <Checkbox
                              checked={station.showPrices}
                              onCheckedChange={(value) =>
                                handleUpdateStation(dept.slug, station.id, { showPrices: value === true })
                              }
                            />
                            Show prices (customer copy)
                          </label>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold"
                        onClick={() => handleAddStation(dept.slug)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add station
                      </Button>
                      {stations.length === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold text-primary"
                          onClick={() => handleApplyButcheryPreset(dept.slug)}
                        >
                          <Layers className="w-3.5 h-3.5 mr-1" />
                          Use butchery preset
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterSettings;
