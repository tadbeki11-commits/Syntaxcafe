import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import api from "@/application";
import { syncEngine } from "@/infrastructure/sync/sync-engine";
import { useSyncRefetch } from "@/hooks/useSyncRefetch";
import { Table, TableFormData } from "../types";
import { INITIAL_FORM } from "../constants";

export const useTableData = () => {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<Table[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TableFormData>(INITIAL_FORM);

  const [syncStatus, setSyncStatus] = useState({
    online: true,
    syncing: false,
    unsyncedCount: 0,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (syncStatus.syncing) return;
    if (!syncStatus.online) {
      toast.error("You are offline. Cannot sync right now.");
      return;
    }
    toast.loading("Synchronizing tables...", { id: "manual-sync-progress" });
    const success = await syncEngine.sync(["tables_pull"]);
    if (success) {
      toast.success("Synchronization completed successfully!", {
        id: "manual-sync-progress",
      });
      await fetchTables();
    } else {
      toast.error("Synchronization failed or nothing to sync.", {
        id: "manual-sync-progress",
      });
    }
  };

  // Only the first load shows the full-screen spinner; background refetches
  // (every sync cycle) refresh the list in place without flashing it.
  const hasLoadedRef = useRef(false);

  const fetchTables = async () => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      const response = await api.tables.getAll();
      const data = (
        ((response as any).data?.data?.tables || []) as Table[]
      ).sort((a, b) => a.number - b.number);
      setTables(data);
    } catch {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Refresh once background hydration / reconnect / manual sync completes.
  useSyncRefetch(() => {
    fetchTables();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(formData.number, 10);
    const cap = parseInt(formData.capacity, 10);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Invalid table number");
      return;
    }
    if (!Number.isFinite(cap) || cap <= 0) {
      toast.error("Invalid capacity");
      return;
    }
    if (tables.find((t) => t.number === num)) {
      toast.error(`Table ${num} already exists`);
      return;
    }
    try {
      await api.tables.create({ number: num, capacity: cap });
      toast.success(`Table ${num} created`);
      setDialogOpen(false);
      setFormData(INITIAL_FORM);
      fetchTables();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create table");
    }
  };

  const handleDelete = async (table: Table) => {
    if (table.status === "occupied") {
      toast.error(`Cannot delete occupied Table ${table.number}`);
      return;
    }
    if (!window.confirm(`Delete Table ${table.number}?`)) return;
    try {
      await api.tables.delete(table.id);
      toast.success(`Table ${table.number} deleted`);
      fetchTables();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete table");
    }
  };

  const available = tables.filter((t) => t.status === "available").length;
  const occupied = tables.filter((t) => t.status === "occupied").length;

  return {
    loading,
    tables,
    dialogOpen,
    setDialogOpen,
    formData,
    setFormData,
    handleSubmit,
    handleDelete,
    available,
    occupied,
    fetchTables,
    syncStatus,
    handleManualSync,
  };
};
export default useTableData;
