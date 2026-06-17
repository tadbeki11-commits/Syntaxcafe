import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import api from '@/application';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BranchBadge from '../../components/common/BranchBadge';
import { getApproximateServerDate } from '@/shared/utils/serverTime';
import ExpenseRowEditor, { ExpenseRow } from './components/CashierExpense/ExpenseRowEditor';
import ExpenseFilters from './components/CashierExpense/ExpenseFilters';
import ExpenseLog, { ExpenseEntry } from './components/CashierExpense/ExpenseLog';
import ExpenseEntryCard from './components/CashierExpense/ExpenseEntryCard';

const emptyRow = (): ExpenseRow => ({ item: '', cost: '' });

const sumRows = (rows: ExpenseRow[]) =>
  (rows || []).reduce((sum, r) => {
    const n = parseFloat(r?.cost);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

const startOfLocalDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfLocalDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const inRange = (entryDate: Date, from: Date | null, to: Date | null) => {
  const t = entryDate.getTime();
  if (Number.isNaN(t)) return false;
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
};

const CashierExpenses = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ExpenseRow[]>([emptyRow()]);
  const [saved, setSaved] = useState<ExpenseEntry[]>([]);

  // Filters
  const [savedFilter, setSavedFilter] = useState('today');
  const [customMode, setCustomMode] = useState('specific');
  const [customDate, setCustomDate] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');

  // Edit / delete state for saved entries (ids are UUID strings)
  const [editId, setEditId] = useState<string | null>(null);
  const [editRows, setEditRows] = useState<ExpenseRow[]>([emptyRow()]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const total = useMemo(() => sumRows(rows), [rows]);
  const editTotal = useMemo(() => sumRows(editRows), [editRows]);

  const filteredSaved = useMemo(() => {
    const list = Array.isArray(saved) ? saved : [];
    const now = getApproximateServerDate();

    let from: Date | null = null;
    let to: Date | null = null;

    if (savedFilter === 'today') {
      from = startOfLocalDay(now);
      to = endOfLocalDay(now);
    } else if (savedFilter === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = startOfLocalDay(y);
      to = endOfLocalDay(y);
    } else if (savedFilter === 'custom') {
      if (customMode === 'specific' && customDate) {
        from = startOfLocalDay(new Date(customDate));
        to = endOfLocalDay(new Date(customDate));
      } else if (customMode === 'range') {
        from = customFrom ? startOfLocalDay(new Date(customFrom)) : null;
        to = customTo ? endOfLocalDay(new Date(customTo)) : null;
      }
    }

    const byDate =
      from || to
        ? list.filter((e) => inRange(new Date(e?.created_at || 0), from, to))
        : list;

    const term = search.trim().toLowerCase();
    if (!term) return byDate;
    return byDate.filter((e) =>
      (e?.items || []).some((it) => String(it?.item || '').toLowerCase().includes(term)),
    );
  }, [customDate, customFrom, customMode, customTo, saved, savedFilter, search]);

  const grandTotal = useMemo(
    () => filteredSaved.reduce((sum, e) => sum + (Number(e?.total) || 0), 0),
    [filteredSaved],
  );

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.expenses.getAll();
      const list = (resp as any)?.data?.data?.expenses ?? (resp as any)?.data?.expenses ?? [];
      setSaved(Array.isArray(list) ? list : []);
    } catch {
      setSaved([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Validate + parse rows into { item, cost } pairs, or null (with a toast) if empty.
  const collectValidRows = (source: ExpenseRow[]) => {
    const parsed = (source || [])
      .map((r) => ({ item: String(r?.item || '').trim(), cost: parseFloat(r?.cost) }))
      .filter((r) => r.item && Number.isFinite(r.cost));

    if (parsed.length === 0) {
      toast.error('Enter at least one expense with a valid cost');
      return null;
    }
    return parsed;
  };

  const submit = async () => {
    const parsed = collectValidRows(rows);
    if (!parsed) return;

    setSaving(true);
    try {
      await api.expenses.create({ items: parsed });
      toast.success('Expenses saved');
      setRows([emptyRow()]);
      await loadExpenses();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to save expenses');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (entry: ExpenseEntry) => {
    setEditId(entry?.id ?? null);
    const items = Array.isArray(entry?.items) ? entry.items : [];
    setEditRows(
      items.length
        ? items.map((it) => ({ item: String(it?.item ?? ''), cost: String(it?.cost ?? '') }))
        : [emptyRow()],
    );
  };

  const closeEdit = () => {
    setEditId(null);
    setEditRows([emptyRow()]);
  };

  const saveEdit = async () => {
    if (editId == null) return;
    const parsed = collectValidRows(editRows);
    if (!parsed) return;

    setSavingEdit(true);
    try {
      await api.expenses.update(editId, { items: parsed });
      toast.success('Expense updated');
      closeEdit();
      await loadExpenses();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to update expense');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (entry: ExpenseEntry) => {
    if (entry?.id == null) return;
    if (!window.confirm('Delete this expense entry? This cannot be undone.')) return;

    setDeletingId(entry.id);
    try {
      await api.expenses.delete(entry.id);
      toast.success('Expense deleted');
      await loadExpenses();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Expenses"
        description="Record purchased items and their costs, then submit to save them."
        actions={<BranchBadge />}
      />

      <ExpenseEntryCard
        rows={rows}
        onRowsChange={setRows}
        total={total}
        saving={saving}
        onSubmit={submit}
      />

      <div className="rounded-lg border">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-base font-semibold">Saved Expenses</h3>
          <ExpenseFilters
            savedFilter={savedFilter}
            onSavedFilterChange={setSavedFilter}
            customMode={customMode}
            onCustomModeChange={setCustomMode}
            customDate={customDate}
            onCustomDateChange={setCustomDate}
            customFrom={customFrom}
            onCustomFromChange={setCustomFrom}
            customTo={customTo}
            onCustomToChange={setCustomTo}
            search={search}
            onSearchChange={setSearch}
            onRefresh={loadExpenses}
          />
        </div>
        <div className="p-4">
          {loading ? (
            <LoadingSpinner text="Loading expenses..." />
          ) : (
            <ExpenseLog
              entries={filteredSaved}
              grandTotal={grandTotal}
              onEdit={openEdit}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          )}
        </div>
      </div>

      <Dialog open={editId != null} onOpenChange={(open) => (!open ? closeEdit() : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Expense Entry</DialogTitle>
          </DialogHeader>

          <ExpenseRowEditor
            rows={editRows}
            onChange={setEditRows}
            total={editTotal}
            showTotal
            disabled={savingEdit}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} disabled={savingEdit}>
              <Save className="h-4 w-4 mr-2" />
              {savingEdit ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashierExpenses;
