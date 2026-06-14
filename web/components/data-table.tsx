"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Override the text used when matching this column against the search query. */
  searchValue?: (row: T) => string;
};

export type DataTableFilter<T> = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** Custom predicate; defaults to String(row[key]) === value. */
  match?: (row: T, value: string) => boolean;
};

export type DateRangeFilter<T> = {
  key: string;
  label: string;
  /** Returns the row's date (ISO string / Date / null) to compare against the range. */
  getDate: (row: T) => string | Date | null | undefined;
};

function textOf<T>(row: T, col: Column<T> | undefined, key: string): string {
  if (col?.searchValue) return col.searchValue(row);
  return String((row as Record<string, unknown>)[key] ?? "");
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" },
];

/** Resolve a preset key into a yyyy-mm-dd from/to range (local time). */
function presetRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: fmtDate(today), to: fmtDate(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: fmtDate(y), to: fmtDate(y) };
    }
    case "this_week": {
      // Week runs Monday–Sunday.
      const monday = new Date(today);
      monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return { from: fmtDate(monday), to: fmtDate(sunday) };
    }
    case "this_month":
      return {
        from: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "this_year":
      return {
        from: fmtDate(new Date(now.getFullYear(), 0, 1)),
        to: fmtDate(new Date(now.getFullYear(), 11, 31)),
      };
    default:
      return {};
  }
}

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  getRowKey,
  searchPlaceholder = "Search…",
  searchKeys,
  filters,
  dateFilters,
  pageSize = 10,
  emptyMessage = "Nothing here yet.",
  rowActions,
  toolbar,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  getRowKey?: (row: T, index: number) => string | number;
  searchPlaceholder?: string;
  /** Column keys to search across. Defaults to every column key. */
  searchKeys?: string[];
  filters?: DataTableFilter<T>[];
  dateFilters?: DateRangeFilter<T>[];
  pageSize?: number;
  emptyMessage?: string;
  rowActions?: (row: T) => React.ReactNode;
  /** Extra controls rendered on the right side of the toolbar. */
  toolbar?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Record<string, string>>({});
  const [ranges, setRanges] = useState<Record<string, { from?: string; to?: string }>>({});
  const [presets, setPresets] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      for (const f of filters ?? []) {
        const val = active[f.key];
        if (!val) continue;
        const ok = f.match
          ? f.match(row, val)
          : String((row as Record<string, unknown>)[f.key] ?? "") === val;
        if (!ok) return false;
      }
      for (const f of dateFilters ?? []) {
        const range = ranges[f.key];
        if (!range?.from && !range?.to) continue;
        const raw = f.getDate(row);
        if (!raw) return false;
        const t = new Date(raw).getTime();
        if (Number.isNaN(t)) return false;
        if (range.from && t < new Date(`${range.from}T00:00:00`).getTime()) return false;
        if (range.to && t > new Date(`${range.to}T23:59:59.999`).getTime()) return false;
      }
      if (!q) return true;
      const keys = searchKeys ?? columns.map((c) => c.key);
      return keys.some((k) => {
        const col = columns.find((c) => c.key === k);
        return textOf(row, col, k).toLowerCase().includes(q);
      });
    });
  }, [rows, query, active, ranges, filters, dateFilters, searchKeys, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const paged = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const colSpan = columns.length + (rowActions ? 1 : 0);

  function onQuery(v: string) {
    setQuery(v);
    setPage(0);
  }
  function onFilter(key: string, v: string) {
    setActive((prev) => ({ ...prev, [key]: v }));
    setPage(0);
  }
  function onRange(key: string, bound: "from" | "to", v: string) {
    setRanges((prev) => ({ ...prev, [key]: { ...prev[key], [bound]: v || undefined } }));
    setPresets((prev) => ({ ...prev, [key]: "custom" }));
    setPage(0);
  }
  function onPreset(key: string, preset: string) {
    setPresets((prev) => ({ ...prev, [key]: preset }));
    setRanges((prev) => ({ ...prev, [key]: presetRange(preset) }));
    setPage(0);
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
            />
          </div>

          {filters?.map((f) => (
            <select
              key={f.key}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              value={active[f.key] ?? ""}
              onChange={(e) => onFilter(f.key, e.target.value)}>
              <option value="">{f.label}: All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}

          {dateFilters?.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5">
              <select
                aria-label={`${f.label} range`}
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                value={presets[f.key] ?? ""}
                onChange={(e) => onPreset(f.key, e.target.value)}>
                <option value="">{f.label}: All time</option>
                {DATE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value="custom">Custom range</option>
              </select>
              <Input
                type="date"
                aria-label={`${f.label} from`}
                value={ranges[f.key]?.from ?? ""}
                onChange={(e) => onRange(f.key, "from", e.target.value)}
                className="h-9 w-auto"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="date"
                aria-label={`${f.label} to`}
                value={ranges[f.key]?.to ?? ""}
                onChange={(e) => onRange(f.key, "to", e.target.value)}
                className="h-9 w-auto"
              />
            </div>
          ))}

          {toolbar && <div className="sm:ml-auto">{toolbar}</div>}
        </div>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.label}
                </TableHead>
              ))}
              {rowActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={colSpan}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="text-muted-foreground py-8 text-center">
                  {filtered.length === 0 && rows.length > 0
                    ? "No matches for your filters."
                    : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, i) => (
                <TableRow key={getRowKey?.(row, i) ?? (row as { id?: string }).id ?? i}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render
                        ? c.render(row)
                        : ((row as Record<string, unknown>)[c.key] as React.ReactNode) ??
                          "—"}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell className="text-right">{rowActions(row)}</TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {!loading && filtered.length > 0 && (
        <div className="text-muted-foreground flex items-center justify-between gap-3 border-t p-3 text-sm">
          <span>
            Showing {current * pageSize + 1}–
            {Math.min(filtered.length, (current + 1) * pageSize)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <span>
              Page {current + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}>
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}>
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
