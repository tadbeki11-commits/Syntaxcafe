import { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/application";
import toast from "react-hot-toast";
import { syncEngine } from "@/infrastructure/sync/sync-engine";
import {
  InventoryItem,
  NormalizedInventoryItem,
  InventoryFormData,
  InventoryQtyData,
  StockTransfer,
  StockTransferFormData,
  StockLocation,
  InventoryMovement,
} from "../types";
import { printStockTransferReceipts } from "@/utils/receiptPrinter";
import { getContainer, TOKENS } from "@/bootstrap/container";
import type { UserFacade } from "@/application/users/user.facade";

const usersApi = () => getContainer().resolve<UserFacade>(TOKENS.userFacade);

const defaultFormData: InventoryFormData = {
  name: "",
  unit: "piece",
  base_unit: "piece",
  pieces_per_unit: 1,
  min_quantity: 0,
  min_quantity_unit: "base",
  min_quantity_mode: "global",
  notes: "",
  initial_stock: [],
};

export const useInventoryData = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [qtyDialog, setQtyDialog] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedItem, setSelectedItem] =
    useState<NormalizedInventoryItem | null>(null);
  const [transferDialog, setTransferDialog] = useState(false);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementLoading, setMovementLoading] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [formData, setFormData] = useState<InventoryFormData>(defaultFormData);
  const [qtyData, setQtyData] = useState<InventoryQtyData>({
    mode: "set",
    location: "",
    location_id: null,
    quantity: "",
    delta: "",
    quantity_unit: "base",
  });
  const [transferData, setTransferData] = useState<StockTransferFormData>({
    from_location: "",
    to_location: "",
    notes: "",
    lines: [],
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Transfer pagination state
  const [transferPage, setTransferPage] = useState(1);
  const [transferLimit, setTransferLimit] = useState(10);
  const [transferTotalCount, setTransferTotalCount] = useState(0);
  const [transferTotalPages, setTransferTotalPages] = useState(1);

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
    toast.loading("Synchronizing stock transfers...", { id: "manual-sync-progress" });
    const success = await syncEngine.sync(['inventory_pull']);
    if (success) {
      toast.success("Synchronization completed successfully!", {
        id: "manual-sync-progress",
      });
      await fetchAll();
    } else {
      toast.error("Synchronization failed or nothing to sync.", {
        id: "manual-sync-progress",
      });
    }
  };

  /** Full refresh — fetches everything (inventory + transfers + users + locations). */
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, transferRes, usersRes, locationsRes] = await Promise.all([
        api.inventory.getAll(page, limit, searchTerm),
        (api.inventory as any).getTransfers?.(transferPage, transferLimit),
        usersApi().getAll().catch(() => ({ data: { data: { users: [] } } })),
        api.stockLocations.getAll(true).catch(() => ({ data: { data: { locations: [] } } })),
      ]);

      const data = (invRes as any)?.data?.data ?? (invRes as any)?.data ?? {};
      setItems(data.items ?? []);
      setTotalCount(data.count ?? 0);
      setTotalPages(data.totalPages ?? 1);

      const transferData = (transferRes as any)?.data?.data ?? (transferRes as any)?.data ?? {};
      setTransfers(transferData.transfers ?? []);
      setTransferTotalCount(transferData.count ?? 0);
      setTransferTotalPages(transferData.totalPages ?? 1);

      setUsers(
        (usersRes as any)?.data?.data?.users ??
        (usersRes as any)?.data?.users ??
        [],
      );

      const rawLocations =
        (locationsRes as any)?.data?.data?.locations ??
        (locationsRes as any)?.data?.locations ??
        [];

      const mappedLocations = rawLocations.map((loc: any) => ({
        // Use remoteId as the canonical id so it matches stock_by_location[].location_id
        // which is always the server-side remote ID. Fall back to local id only if no
        // remoteId exists (e.g. unsynced local-only location).
        id: loc.remoteId ?? loc.remote_id ?? loc.id ?? 0,
        name: loc.name || "",
        slug: loc.slug || "",
        type: loc.locationType || loc.type || "storage",
        linked_main_category_slug: loc.linkedMainCategorySlug || loc.linked_main_category_slug,
        is_default: loc.isDefault ?? loc.is_default ?? false,
        display_order: loc.displayOrder ?? loc.display_order ?? 0,
        active: loc.isActive ?? loc.active ?? true,
      }));

      setStockLocations(mappedLocations);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, transferPage, transferLimit]);

  /**
   * Lightweight refresh — only re-fetches inventory items and transfers.
   * Used after add/edit/transfer so we don't wait for users & locations
   * (which rarely change) to re-render.
   */
  const fetchInventoryOnly = useCallback(async () => {
    try {
      const [invRes, transferRes] = await Promise.all([
        api.inventory.getAll(page, limit, searchTerm),
        (api.inventory as any).getTransfers?.(transferPage, transferLimit).catch(() => null),
      ]);
      const data = (invRes as any)?.data?.data ?? (invRes as any)?.data ?? {};
      const freshItems = data.items ?? [];
      setItems(freshItems);
      setTotalCount(data.count ?? 0);
      setTotalPages(data.totalPages ?? 1);
      const transferData = (transferRes as any)?.data?.data ?? (transferRes as any)?.data ?? {};
      const newTransfers = transferData.transfers ?? null;
      if (newTransfers !== null) {
        setTransfers(newTransfers);
        setTransferTotalCount(transferData.count ?? 0);
        setTransferTotalPages(transferData.totalPages ?? 1);
      }
      return freshItems;
    } catch {
      // silently ignore — full data is already on screen
      return null;
    }
  }, [page, limit, searchTerm, transferPage, transferLimit]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const normalizedItems = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((it) => {
      const stockByLocation: any[] = Array.isArray(
        (it as any).stock_by_location,
      )
        ? (it as any).stock_by_location
        : [];

      return {
        ...it,
        stock_by_location: stockByLocation,
        pieces_per_unit:
          parseFloat(String((it as any).pieces_per_unit ?? 1)) || 1,
        base_unit: (it as any).base_unit || "piece",
      } as NormalizedInventoryItem;
    });
  }, [items]);

  const filtered = useMemo(() => {
    // Search is now handled server-side, so filtered is the same as normalizedItems
    return normalizedItems;
  }, [normalizedItems]);

  const lowStockCount = useMemo(() => {
    return filtered.filter((it) => {
      const min = parseFloat(String(it.min_quantity || 0));
      const minMode = (it as any).min_quantity_mode || "global";
      const stockByLocation: any[] = Array.isArray(
        (it as any).stock_by_location,
      )
        ? (it as any).stock_by_location
        : [];
      const piecesPerUnit = Math.max(
        1,
        parseFloat(String((it as any).pieces_per_unit || 1)) || 1,
      );
      const totalQty =
        stockByLocation.length > 0
          ? stockByLocation.reduce(
            (sum, s) => sum + parseFloat(String(s.quantity || 0)),
            0,
          ) * piecesPerUnit
          : parseFloat(String(it.quantity || it.store_quantity || 0)) *
          piecesPerUnit;

      if (minMode === "per_location" && stockByLocation.length > 0) {
        const totalMinQty = stockByLocation.reduce(
          (sum, s) => sum + parseFloat(String(s.min_quantity || 0)),
          0,
        );
        // Compare total stock against the combined per-location minimums.
        return (
          Number.isFinite(totalMinQty) &&
          totalMinQty > 0 &&
          totalQty < totalMinQty
        );
      } else {
        // Global mode: check total against global min
        return totalQty < min && min > 0;
      }
    }).length;
  }, [filtered]);

  const openAdd = (locationId?: number | null) => {
    setIsAdding(true);
    if (locationId) {
      setFormData({
        ...defaultFormData,
        initial_stock: [{
          location_id: locationId,
          quantity: 0,
          quantity_unit: "base",
          min_quantity: 0,
        }]
      });
    } else {
      setFormData(defaultFormData);
    }
    setEditDialog(true);
  };

  const openEdit = (item: NormalizedInventoryItem) => {
    setIsAdding(false);
    setSelectedItem(item);
    setFormData({
      name: item?.name || "",
      unit: item?.unit || "piece",
      base_unit: item?.base_unit || "piece",
      pieces_per_unit: parseFloat(String(item?.pieces_per_unit ?? 1)) || 1,
      min_quantity: parseFloat(String(item?.min_quantity ?? 0)),
      min_quantity_unit: "base",
      min_quantity_mode: "global",
      notes: item?.notes || "",
    });
    setEditDialog(true);
  };

  const openQty = (item: NormalizedInventoryItem) => {
    setSelectedItem(item);
    // Pick the first stock entry (usually the main store) for default qty display
    const stockByLocation: any[] = Array.isArray(
      (item as any).stock_by_location,
    )
      ? (item as any).stock_by_location
      : [];
    const storeEntry =
      stockByLocation.find(
        (s: any) =>
          s.location_name?.toLowerCase().includes("store") ||
          s.location_name?.toLowerCase().includes("main"),
      ) ?? stockByLocation[0];
    const defaultLocationId = storeEntry?.location_id ?? null;

    // If no stock entry found, try to get the default location from stockLocations
    let finalLocationId = defaultLocationId;
    if (!finalLocationId && stockLocations.length > 0) {
      const defaultLoc =
        stockLocations.find((l: StockLocation) => l.is_default) ??
        stockLocations[0];
      finalLocationId = defaultLoc.id;
    }

    const defaultQty =
      storeEntry?.quantity ?? item.store_quantity ?? item.quantity ?? "";
    setQtyData({
      mode: "set",
      location: "",
      location_id: finalLocationId,
      quantity: String(defaultQty),
      delta: "",
      quantity_unit: "base",
    });
    setQtyDialog(true);
  };

  const openHistory = async (item: NormalizedInventoryItem) => {
    setSelectedItem(item);
    try {
      setMovementLoading(true);
      const response = await (api.inventory as any).getMovements?.(item.id);
      const rows =
        (response as any)?.data?.data?.movements ??
        (response as any)?.data?.movements ??
        [];
      setMovements(Array.isArray(rows) ? rows : []);
    } catch {
      setMovements([]);
      toast.error("Failed to load movement history");
    } finally {
      setMovementLoading(false);
    }
  };

  const openTransfer = () => {
    setTransferData({
      from_location: "",
      to_location: "",
      notes: "",
      lines: [],
    });
    setTransferDialog(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingForm) return;
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const piecesPerUnit = Math.max(
      1,
      parseFloat(String(formData.pieces_per_unit) || "1"),
    );

    // Ensure min_quantity is in base units
    const baseMinQuantity =
      formData.min_quantity_unit === "purchase"
        ? formData.min_quantity * piecesPerUnit
        : formData.min_quantity;

    const payload: any = {
      name: formData.name.trim(),
      unit: formData.unit || "piece",
      base_unit: formData.base_unit || "piece",
      pieces_per_unit: piecesPerUnit,
      min_quantity:
        formData.min_quantity_mode === "per_location"
          ? 0
          : parseFloat(String(baseMinQuantity) || "0"),
      min_quantity_mode: formData.min_quantity_mode || "global",
      notes: formData.notes || "",
    };

    // Include initial stock only when adding a new item and stock is specified
    if (
      isAdding &&
      formData.initial_stock &&
      formData.initial_stock.length > 0
    ) {
      // Ensure all stock quantities are in base units
      const stockInBaseUnits = formData.initial_stock
        .map((s) => ({
          ...s,
          quantity:
            s.quantity_unit === "purchase"
              ? s.quantity * piecesPerUnit
              : s.quantity,
          min_quantity: s.min_quantity || 0,
        }))
        .filter(
          (s) =>
            s.quantity >= 0 ||
            (formData.min_quantity_mode === "per_location" &&
              s.min_quantity >= 0),
        );

      if (stockInBaseUnits.length > 0) {
        payload.stock_by_location = stockInBaseUnits;
      }
    }

    setIsSubmittingForm(true);
    try {
      if (isAdding) {
        await api.inventory.create(payload);
        toast.success("Item added");
      } else {
        if (!selectedItem) return;
        await api.inventory.update(selectedItem.id, payload);
        toast.success("Item updated");
      }
      setEditDialog(false);
      // Only refresh inventory items — much faster than full fetchAll
      fetchInventoryOnly();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const submitQty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || isSubmittingForm) return;
    // Send location_id if available, fall back to legacy location string
    const locationId = (qtyData as any).location_id ?? null;
    const payload: any = { location: qtyData.location };
    if (locationId) payload.location_id = locationId;

    if (qtyData.mode === "delta") {
      const d = parseFloat(qtyData.delta);
      if (!Number.isFinite(d)) {
        toast.error("Invalid delta");
        return;
      }
      payload.delta = d;
    } else {
      const q = parseFloat(qtyData.quantity);
      if (!Number.isFinite(q)) {
        toast.error("Invalid quantity");
        return;
      }
      payload.quantity = q;
    }

    setIsSubmittingForm(true);
    try {
      await api.inventory.updateQuantity(selectedItem.id, payload);
      toast.success("Quantity updated");
      setQtyDialog(false);
      fetchInventoryOnly();
    } catch {
      toast.error("Failed to update quantity");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTransfer) return;

    if (transferData.lines.length === 0) {
      toast.error("Add at least one item to transfer");
      return;
    }
    if (!transferData.to_location) {
      toast.error("Select a destination location");
      return;
    }
    if (!transferData.from_location) {
      toast.error("Select a source location");
      return;
    }

    const fromLocationId = transferData.from_location;
    const toLocationId = transferData.to_location;

    // Build items array, converting quantities to base units
    const resolvedLines: { inventory_item_id: string; quantity: number }[] = [];
    for (const line of transferData.lines) {
      const itemId = line.inventory_item_id;
      const enteredQty = parseFloat(line.quantity);
      const item = normalizedItems.find((c) => String(c.id) === String(itemId));
      if (!item || !Number.isFinite(enteredQty) || enteredQty <= 0) {
        toast.error(`Invalid entry for item ${item?.name ?? itemId}`);
        return;
      }
      const multiplier =
        line.quantity_unit === "purchase"
          ? Math.max(1, parseFloat(String(item.pieces_per_unit ?? 1)))
          : 1;
      resolvedLines.push({ inventory_item_id: itemId, quantity: enteredQty * multiplier });
    }

    setIsSubmittingTransfer(true);
    try {
      const payload: any = {
        status: "sent",
        notes: transferData.notes,
        items: resolvedLines,
        to_location_id: toLocationId,
        from_location_id: fromLocationId || null,
      };

      const response = await (api.inventory as any).createTransfer(payload);
      const transfer =
        response?.data?.data?.transfer ?? response?.data?.transfer;

      toast.success("Stock transferred successfully");
      setTransferDialog(false);
      // Refresh inventory FIRST so the receipt prints the balances that remain
      // *after* this transfer. The backend has already applied it; printing with
      // the stale pre-transfer items would show the old amounts.
      const freshItems = await fetchInventoryOnly();
      await printStockTransferReceipts(transfer, freshItems ?? normalizedItems, stockLocations);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to transfer stock");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const receiveTransfer = async (transfer: StockTransfer) => {
    try {
      await (api.inventory as any).receiveTransfer(
        transfer.remote_id ?? transfer.id,
      );
      toast.success("Transfer marked as received");
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to receive transfer");
    }
  };

  const fetchTransfersOnly = useCallback(async () => {
    try {
      const transferRes = await (api.inventory as any).getTransfers?.(transferPage, transferLimit);
      const transferData = (transferRes as any)?.data?.data ?? (transferRes as any)?.data ?? {};
      setTransfers(transferData.transfers ?? []);
      setTransferTotalCount(transferData.count ?? 0);
      setTransferTotalPages(transferData.totalPages ?? 1);
    } catch {
      // silently ignore
    }
  }, [transferPage, transferLimit]);

  const printTransferReceipts = async (transfer: StockTransfer) => {
    try {
      await printStockTransferReceipts(transfer, normalizedItems, stockLocations);
    } catch (err) {
      console.error("Failed to print stock transfer receipts:", err);
      toast.error("Failed to print transfer receipts");
    }
  };

  const deleteItem = async (item: NormalizedInventoryItem) => {
    if (!window.confirm("Delete this inventory item?")) return;
    try {
      await api.inventory.delete(item.id);
      toast.success("Deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return {
    loading,
    items,
    transfers,
    users,
    searchTerm,
    setSearchTerm,
    editDialog,
    setEditDialog,
    qtyDialog,
    setQtyDialog,
    transferDialog,
    setTransferDialog,
    isAdding,
    selectedItem,
    setSelectedItem,
    formData,
    setFormData,
    qtyData,
    setQtyData,
    transferData,
    setTransferData,
    stockLocations,
    setStockLocations,
    fetchAll,
    normalizedItems,
    filtered,
    lowStockCount,
    openAdd,
    openEdit,
    openQty,
    openHistory,
    openTransfer,
    isSubmittingForm,
    isSubmittingTransfer,
    submitForm,
    submitQty,
    submitTransfer,
    receiveTransfer,
    printTransferReceipts,
    deleteItem,
    movements,
    movementLoading,
    syncStatus,
    handleManualSync,
    fetchTransfersOnly,
    // Pagination
    page,
    limit,
    totalCount,
    totalPages,
    setPage,
    setLimit,
    // Transfer pagination
    transferPage,
    transferLimit,
    transferTotalCount,
    transferTotalPages,
    setTransferPage,
    setTransferLimit,
  };
};

export default useInventoryData;
