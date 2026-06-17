import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Download,
  FileUp,
  Loader2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import api from "@/application";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/layout/PageHeader";
import OfflineBanner from "@/components/OfflineBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { syncEngine } from "@/infrastructure/sync/sync-engine";
import { slugifyCategory } from "../utils";
import {
  CSV_TEMPLATE,
  JSON_TEMPLATE,
  ParsedMenuRow,
  ParseResult,
  parseMenuFile,
  rowToMenuItemPayload,
  ValidationContext,
} from "./parser";

const downloadFile = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const BulkMenuImport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [online, setOnline] = useState(true);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation context (known departments + existing names) loaded from the menu.
  const ctxRef = useRef<ValidationContext>({
    knownMainCategorySlugs: new Set(),
    existingNames: new Set(),
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) =>
      setOnline(status.online),
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [itemsResp, catsResp] = await Promise.all([
          api.menu.getAll({ page: 1, limit: 1000 }),
          api.menu.getMainCategories({ is_active: true }),
        ]);
        const itemsPayload = (itemsResp as any)?.data;
        const items =
          itemsPayload?.data?.menuItems || itemsPayload?.menuItems || [];
        const catsPayload = (catsResp as any)?.data;
        const cats =
          catsPayload?.data?.mainCategories || catsPayload?.mainCategories || [];

        ctxRef.current = {
          existingNames: new Set(
            items
              .map((i: any) => String(i?.name || "").trim().toLowerCase())
              .filter(Boolean),
          ),
          knownMainCategorySlugs: new Set(
            cats
              .map((c: any) => slugifyCategory(c?.slug || c?.name || ""))
              .filter(Boolean),
          ),
        };
      } catch {
        // Non-fatal — validation simply won't flag duplicates/unknown depts.
      }
    })();
  }, []);

  const runParse = useCallback((text: string, fmt: "csv" | "json") => {
    if (!text.trim()) {
      setResult(null);
      return;
    }
    setResult(parseMenuFile(text, fmt, ctxRef.current));
  }, []);

  const detectFormat = (name: string): "csv" | "json" =>
    name.toLowerCase().endsWith(".json") ? "json" : "csv";

  const handleFile = async (file: File) => {
    const text = await file.text();
    const fmt = detectFormat(file.name);
    setFormat(fmt);
    setRawText(text);
    setFileName(file.name);
    runParse(text, fmt);
  };

  const handleTextChange = (text: string) => {
    setRawText(text);
    setFileName(null);
    runParse(text, format);
  };

  const handleFormatChange = (fmt: "csv" | "json") => {
    setFormat(fmt);
    runParse(rawText, fmt);
  };

  const validRows = useMemo(
    () => result?.rows.filter((r) => r.errors.length === 0) ?? [],
    [result],
  );
  const errorCount = useMemo(
    () => result?.rows.filter((r) => r.errors.length > 0).length ?? 0,
    [result],
  );
  const warningCount = useMemo(
    () =>
      result?.rows.filter(
        (r) => r.errors.length === 0 && r.warnings.length > 0,
      ).length ?? 0,
    [result],
  );

  const handleImport = async () => {
    if (!online) {
      toast.error("Bulk import requires an internet connection.");
      return;
    }
    if (validRows.length === 0) {
      toast.error("There are no valid rows to import.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { menuItems: validRows.map(rowToMenuItemPayload) };
      await api.menu.syncBulk(payload);
      toast.success(
        `Imported ${validRows.length} item${validRows.length === 1 ? "" : "s"} successfully.`,
      );
      navigate("/dashboard/menu");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Bulk import failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setRawText("");
    setFileName(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <PageHeader
          title="Bulk Menu Import"
          description="You don't have permission to import menu items."
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Bulk Menu Import"
        description="Add many menu items at once from a CSV or JSON file."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/menu")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
        }
      />

      <OfflineBanner online={online} />

      {/* Step 1 — template + upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Get a template & upload your file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadFile("menu-template.csv", CSV_TEMPLATE, "text/csv")
              }
            >
              <Download className="h-4 w-4 mr-2" />
              CSV template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadFile(
                  "menu-template.json",
                  JSON_TEMPLATE,
                  "application/json",
                )
              }
            >
              <Download className="h-4 w-4 mr-2" />
              JSON template
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Required columns: <strong>name</strong> and <strong>price</strong> (whole birr).
            Optional: category, main_category (printing department), tags (separate
            with <code>;</code>), description, is_available (true/false),
            prep_time_minutes, sku, barcode.
          </p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-6 py-8 text-center"
          >
            <FileUp className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {fileName ? fileName : "Drag & drop a .csv or .json file here"}
            </p>
            <p className="text-xs text-muted-foreground">or</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* Paste fallback */}
          <details className="rounded-lg border bg-card">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium">
              …or paste data directly
            </summary>
            <div className="space-y-2 px-4 pb-4">
              <div className="flex gap-2">
                {(["csv", "json"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleFormatChange(fmt)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      format === fmt
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              <textarea
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={format === "csv" ? CSV_TEMPLATE : JSON_TEMPLATE}
                rows={6}
                className="w-full rounded-md border bg-background p-2 font-mono text-xs"
              />
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Step 2 — preview */}
      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">2. Review & confirm</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                {validRows.length} ready
              </Badge>
              {warningCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  {warningCount} warning{warningCount === 1 ? "" : "s"}
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {errorCount} error{errorCount === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.fatalError ? (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                {result.fatalError}
              </div>
            ) : (
              <>
                {errorCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Rows with errors are skipped. Fix them in your file and
                    re-upload to include them.
                  </p>
                )}
                <div className="max-h-[460px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Avail.</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row) => (
                        <RowView key={row.rowNumber} row={row} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {result && !result.fatalError && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={reset} disabled={submitting}>
            Clear
          </Button>
          <Button
            onClick={handleImport}
            disabled={submitting || validRows.length === 0 || !online}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import {validRows.length} item{validRows.length === 1 ? "" : "s"}
          </Button>
        </div>
      )}
    </div>
  );
};

const RowView = ({ row }: { row: ParsedMenuRow }) => {
  const hasError = row.errors.length > 0;
  const hasWarning = row.warnings.length > 0;
  return (
    <TableRow className={hasError ? "bg-destructive/5" : undefined}>
      <TableCell className="text-xs text-muted-foreground">
        {row.rowNumber}
      </TableCell>
      <TableCell className="font-medium">{row.name || "—"}</TableCell>
      <TableCell className="text-right tabular-nums">
        {row.price ? `${row.price} br` : "—"}
      </TableCell>
      <TableCell>{row.category || "—"}</TableCell>
      <TableCell>{row.main_category || "—"}</TableCell>
      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
        {row.tags.join(", ") || "—"}
      </TableCell>
      <TableCell>{row.is_available ? "Yes" : "No"}</TableCell>
      <TableCell>
        {hasError ? (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            {row.errors.join("; ")}
          </span>
        ) : hasWarning ? (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            {row.warnings.join("; ")}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready
          </span>
        )}
      </TableCell>
    </TableRow>
  );
};

export default BulkMenuImport;
