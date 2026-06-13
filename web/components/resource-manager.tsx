"use client";

import { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "password" | "switch" | "select";
  options?: { value: string; label: string }[];
  default?: any;
  required?: boolean;
};

export function ResourceManager<T extends { id: string }>({
  title,
  description,
  columns,
  fields,
  load,
  create,
  remove,
  rowActions,
  createLabel = "New",
}: {
  title: string;
  description?: string;
  columns: Column<T>[];
  fields?: Field[];
  load: () => Promise<T[]>;
  create?: (body: any) => Promise<any>;
  remove?: (id: string) => Promise<any>;
  rowActions?: (row: T, reload: () => Promise<void>) => React.ReactNode;
  createLabel?: string;
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

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
    setOpen(true);
  }

  async function submit() {
    if (!create) return;
    try {
      await create(form);
      toast.success("Created");
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

  const showActions = !!remove || !!rowActions;

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.className}>
                    {c.label}
                  </TableHead>
                ))}
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="text-muted-foreground py-8 text-center">
                    Nothing here yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.className}>
                        {c.render ? c.render(row) : ((row as any)[c.key] ?? "—")}
                      </TableCell>
                    ))}
                    {showActions && (
                      <TableCell className="text-right">
                        {rowActions?.(row, reload)}
                        {remove && (
                          <Button variant="ghost" size="icon" onClick={() => onDelete(row.id)}>
                            <Trash2Icon className="text-destructive size-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {create && fields && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{createLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {fields.map((f) => (
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
