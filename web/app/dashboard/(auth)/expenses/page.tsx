"use client";

import { useEffect, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ProfitSummary } from "@/components/reports/profit-summary";
import { Expenses, Orders, Payments } from "@/lib/resources";
import { birr, shortDate } from "@/lib/format";
import { EXPENSE_CATEGORIES, categoryLabel, expenseAmount, ymd } from "@/lib/profit";

type Expense = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  amount_cents: number;
  payment_method: string | null;
  expense_date: string;
  recorded_by_name: string | null;
};

const emptyForm = () => ({
  category: "",
  amount: "",
  expense_date: ymd(new Date()),
  payment_method: "",
  description: "",
});

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const [exp, ord, pay] = await Promise.all([
        Expenses.list(),
        Orders.list().catch(() => []),
        Payments.history().catch(() => []),
      ]);
      setExpenses(Array.isArray(exp) ? exp : []);
      setOrders(Array.isArray(ord) ? ord : []);
      setPayments(Array.isArray(pay) ? pay : []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(row: Expense) {
    setForm({
      category: row.category,
      amount: String(row.amount ?? ""),
      expense_date: row.expense_date ? ymd(new Date(row.expense_date)) : ymd(new Date()),
      payment_method: row.payment_method ?? "",
      description: row.description ?? "",
    });
    setEditingId(row.id);
    setOpen(true);
  }

  async function submit() {
    if (!form.category) {
      toast.error("Pick a category");
      return;
    }
    if (form.amount === "" || Number(form.amount) < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const payload = {
      category: form.category,
      amount: Number(form.amount),
      expense_date: form.expense_date || undefined,
      payment_method: form.payment_method?.trim() || undefined,
      description: form.description?.trim() || undefined,
    };
    try {
      if (editingId) {
        await Expenses.update(editingId, payload);
        toast.success("Expense updated");
      } else {
        await Expenses.create(payload);
        toast.success("Expense recorded");
      }
      setOpen(false);
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to save expense");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      await Expenses.remove(id);
      toast.success("Deleted");
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete expense");
    }
  }

  const columns: Column<Expense>[] = [
    {
      key: "expense_date",
      label: "Date",
      render: (r) => shortDate(r.expense_date),
    },
    {
      key: "category",
      label: "Category",
      render: (r) => (
        <Badge variant="muted" className="capitalize">
          {categoryLabel(r.category)}
        </Badge>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (r) => (
        <span className="text-muted-foreground">{r.description || "—"}</span>
      ),
    },
    {
      key: "payment_method",
      label: "Paid via",
      render: (r) => r.payment_method || "—",
    },
    {
      key: "amount",
      label: "Amount",
      className: "text-right",
      render: (r) => (
        <span className="font-medium">{birr(expenseAmount(r))}</span>
      ),
    },
    {
      key: "recorded_by_name",
      label: "By",
      render: (r) => r.recorded_by_name || "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Record house expenses and track profit (paid sales − expenses)."
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            New expense
          </Button>
        }
      />

      <ProfitSummary orders={orders} payments={payments} expenses={expenses} />

      <DataTable<Expense>
        columns={columns}
        rows={expenses}
        loading={loading}
        searchKeys={["category", "description", "payment_method", "recorded_by_name"]}
        searchPlaceholder="Search expenses…"
        filters={[
          {
            key: "category",
            label: "Category",
            options: EXPENSE_CATEGORIES,
          },
        ]}
        dateFilters={[
          { key: "expense_date", label: "Date", getDate: (r) => r.expense_date },
        ]}
        rowActions={(row) => (
          <>
            <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
              <PencilIcon className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(row.id)}>
              <Trash2Icon className="text-destructive size-4" />
            </Button>
          </>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit expense" : "New expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={form.category ?? ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">—</option>
                {EXPENSE_CATEGORIES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Amount (birr)</Label>
              <Input
                type="number"
                min={0}
                value={form.amount ?? ""}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.expense_date ?? ""}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Paid via (optional)</Label>
              <Input
                value={form.payment_method ?? ""}
                placeholder="Cash, bank transfer…"
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
