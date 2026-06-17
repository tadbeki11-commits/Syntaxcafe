"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileUpIcon,
  Loader2Icon,
  UploadIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { Menu } from "@/lib/resources";
import {
  CSV_TEMPLATE,
  JSON_TEMPLATE,
  ParsedMenuRow,
  ParseResult,
  parseMenuFile,
  rowToMenuItemPayload,
  slugify,
  ValidationContext,
} from "@/lib/menu-import";

function downloadFile(filename: string, content: string, mime: string) {
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

export default function BulkMenuImportPage() {
  const router = useRouter();
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ctxRef = useRef<ValidationContext>({
    knownMainCategorySlugs: new Set(),
    existingNames: new Set(),
  });

  // Load existing names + departments so we can flag duplicates / unknown depts.
  useEffect(() => {
    Promise.all([Menu.items(), Menu.categories()])
      .then(([items, cats]) => {
        ctxRef.current = {
          existingNames: new Set(
            (items as { name?: string }[])
              .map((i) => String(i?.name || "").trim().toLowerCase())
              .filter(Boolean),
          ),
          knownMainCategorySlugs: new Set(
            (cats as { slug?: string; name?: string }[])
              .map((c) => slugify(c?.slug || c?.name || ""))
              .filter(Boolean),
          ),
        };
      })
      .catch(() => {
        /* non-fatal — validation just won't flag duplicates */
      });
  }, []);

  function runParse(text: string, fmt: "csv" | "json") {
    if (!text.trim()) {
      setResult(null);
      return;
    }
    setResult(parseMenuFile(text, fmt, ctxRef.current));
  }

  const detectFormat = (name: string): "csv" | "json" =>
    name.toLowerCase().endsWith(".json") ? "json" : "csv";

  async function handleFile(file: File) {
    const text = await file.text();
    const fmt = detectFormat(file.name);
    setFormat(fmt);
    setRawText(text);
    setFileName(file.name);
    runParse(text, fmt);
  }

  function handleTextChange(text: string) {
    setRawText(text);
    setFileName(null);
    runParse(text, format);
  }

  function handleFormatChange(fmt: "csv" | "json") {
    setFormat(fmt);
    runParse(rawText, fmt);
  }

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
      result?.rows.filter((r) => r.errors.length === 0 && r.warnings.length > 0)
        .length ?? 0,
    [result],
  );

  async function handleImport() {
    if (validRows.length === 0) {
      toast.error("There are no valid rows to import.");
      return;
    }
    setSubmitting(true);
    try {
      await Menu.bulkSync(validRows.map(rowToMenuItemPayload));
      toast.success(
        `Imported ${validRows.length} item${validRows.length === 1 ? "" : "s"} successfully.`,
      );
      router.push("/dashboard/menu");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk import failed");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setRawText("");
    setFileName(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Menu Import"
        description="Add many menu items at once from a CSV or JSON file."
        action={
          <Button variant="outline" onClick={() => router.push("/dashboard/menu")}>
            <ArrowLeftIcon className="size-4" />
            Back to Menu
          </Button>
        }
      />

      {/* Step 1 — template + upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            1. Get a template &amp; upload your file
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile("menu-template.csv", CSV_TEMPLATE, "text/csv")}>
              <DownloadIcon className="size-4" />
              CSV template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadFile("menu-template.json", JSON_TEMPLATE, "application/json")
              }>
              <DownloadIcon className="size-4" />
              JSON template
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            Required columns: <strong>name</strong> and <strong>price</strong>{" "}
            (whole birr). Optional: category, main_category, tags (separate with{" "}
            <code>;</code>), description, is_available (true/false),
            prep_time_minutes, sku, barcode.
          </p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className="border-muted-foreground/25 bg-muted/20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center">
            <FileUpIcon className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">
              {fileName ?? "Drag & drop a .csv or .json file here"}
            </p>
            <p className="text-muted-foreground text-xs">or</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}>
              <UploadIcon className="size-4" />
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
          <details className="bg-card rounded-lg border">
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
                    }`}>
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              <Textarea
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={format === "csv" ? CSV_TEMPLATE : JSON_TEMPLATE}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Step 2 — preview */}
      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">2. Review &amp; confirm</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2Icon className="size-3 text-emerald-600" />
                {validRows.length} ready
              </Badge>
              {warningCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangleIcon className="size-3 text-amber-500" />
                  {warningCount} warning{warningCount === 1 ? "" : "s"}
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircleIcon className="size-3" />
                  {errorCount} error{errorCount === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.fatalError ? (
              <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-3 text-sm">
                <XCircleIcon className="size-4 shrink-0" />
                {result.fatalError}
              </div>
            ) : (
              <>
                {errorCount > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Rows with errors are skipped. Fix them in your file and
                    re-upload to include them.
                  </p>
                )}
                <div className="max-h-[460px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-card sticky top-0">
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
          <Button onClick={handleImport} disabled={submitting || validRows.length === 0}>
            {submitting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UploadIcon className="size-4" />
            )}
            Import {validRows.length} item{validRows.length === 1 ? "" : "s"}
          </Button>
        </div>
      )}
    </div>
  );
}

function RowView({ row }: { row: ParsedMenuRow }) {
  const hasError = row.errors.length > 0;
  const hasWarning = row.warnings.length > 0;
  return (
    <TableRow className={hasError ? "bg-destructive/5" : undefined}>
      <TableCell className="text-muted-foreground text-xs">
        {row.rowNumber}
      </TableCell>
      <TableCell className="font-medium">{row.name || "—"}</TableCell>
      <TableCell className="text-right tabular-nums">
        {row.price ? `${row.price} br` : "—"}
      </TableCell>
      <TableCell>{row.category || "—"}</TableCell>
      <TableCell>{row.main_category || "—"}</TableCell>
      <TableCell className="text-muted-foreground max-w-[160px] truncate text-xs">
        {row.tags.join(", ") || "—"}
      </TableCell>
      <TableCell>{row.is_available ? "Yes" : "No"}</TableCell>
      <TableCell>
        {hasError ? (
          <span className="text-destructive flex items-center gap-1 text-xs">
            <XCircleIcon className="size-3.5" />
            {row.errors.join("; ")}
          </span>
        ) : hasWarning ? (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangleIcon className="size-3.5" />
            {row.warnings.join("; ")}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2Icon className="size-3.5" />
            Ready
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}
