"use client";

import { useEffect, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import {
  DataTable,
  type Column,
  type DataTableFilter,
  type DateRangeFilter,
} from "@/components/data-table";

export type { Column, DataTableFilter, DateRangeFilter };

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "password" | "switch" | "select";
  options?: { value: string; label: string }[];
  default?: any;
  required?: boolean;
  /** Hide this field when editing an existing row (e.g. password, role). */
  createOnly?: boolean;
};

export function ResourceManager<T extends { id: string }>({
  title,
  description,
  columns,
  fields,
  load,
  create,
  update,
  remove,
  rowActions,
  createLabel = "New",
  editLabel = "Edit",
  searchKeys,
  searchPlaceholder,
  filters,
  dateFilters,
  pageSize,
}: {
  title: string;
  description?: string;
  columns: Column<T>[];
  fields?: Field[];
  load: () => Promise<T[]>;
  create?: (body: any) => Promise<any>;
  update?: (id: string, body: any) => Promise<any>;
  remove?: (id: string) => Promise<any>;
  rowActions?: (row: T, reload: () => Promise<void>) => React.ReactNode;
  createLabel?: string;
  editLabel?: string;
  searchKeys?: string[];
  searchPlaceholder?: string;
  filters?: DataTableFilter<T>[];
  dateFilters?: DateRangeFilter<T>[];
  pageSize?: number;
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const visibleFields = (fields ?? []).filter((f) => !(editingId && f.createOnly));

  async function reload() {
    setLoading(true);
    try {
      setRows(await load());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    const init: Record<string, any> = {};
    fields?.forEach((f) => (init[f.key] = f.default ?? (f.type === "switch" ? true : "")));
    setForm(init);
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(row: T) {
    const init: Record<string, any> = {};
    fields?.forEach((f) => {
      if (f.createOnly) return;
      init[f.key] = (row as Record<string, any>)[f.key] ?? f.default ?? (f.type === "switch" ? false : "");
    });
    setForm(init);
    setEditingId(row.id);
    setOpen(true);
  }

  async function submit() {
    try {
      if (editingId) {
        if (!update) return;
        await update(editingId, form);
        toast.success("Saved");
      } else {
        if (!create) return;
        await create(form);
        toast.success("Created");
      }
      setOpen(false);
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function onDelete(id: string) {
    if (!remove || !confirm("Delete this item?")) return;
    try {
      await remove(id);
      toast.success("Deleted");
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const canEdit = !!update && !!fields;
  const showActions = !!remove || !!rowActions || canEdit;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={
          create && fields ? (
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              {createLabel}
            </Button>
          ) : undefined
        }
      />

      <DataTable<T>
        columns={columns}
        rows={rows}
        loading={loading}
        searchKeys={searchKeys}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        dateFilters={dateFilters}
        pageSize={pageSize}
        rowActions={
          showActions
            ? (row) => (
                <>
                  {rowActions?.(row, reload)}
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                      <PencilIcon className="size-4" />
                    </Button>
                  )}
                  {remove && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(row.id)}>
                      <Trash2Icon className="text-destructive size-4" />
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />

      {(create || update) && fields && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? editLabel : createLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {visibleFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  {f.type === "switch" ? (
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={!!form[f.key]}
                        onCheckedChange={(v) => setForm({ ...form, [f.key]: v })}
                      />
                      <Label>{f.label}</Label>
                    </div>
                  ) : f.type === "select" ? (
                    <>
                      <Label>{f.label}</Label>
                      <select
                        className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                        value={form[f.key] ?? ""}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                        <option value="">—</option>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <Label>{f.label}</Label>
                      <Input
                        type={f.type ?? "text"}
                        value={form[f.key] ?? ""}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
