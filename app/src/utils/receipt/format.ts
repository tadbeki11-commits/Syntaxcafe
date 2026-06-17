/**
 * Small formatting helpers shared across the receipt builders.
 */

export const escapeHtml = (value: any) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const formatQty = (value: any) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

// Helper to format quantity in both base and purchase units
export const formatQtyBothUnits = (qty: number, item: any) => {
  const baseUnit = item?.base_unit || "pcs";
  const purchaseUnit = item?.unit || "box";
  const piecesPerUnit = Math.max(1, Number(item?.pieces_per_unit || 1));

  const baseQty = qty;
  const purchaseQty = qty / piecesPerUnit;

  // Only show purchase unit if it's different from base and pieces_per_unit > 1
  if (piecesPerUnit > 1 && purchaseUnit !== baseUnit) {
    return `${formatQty(baseQty)} ${baseUnit} (${formatQty(purchaseQty)} ${purchaseUnit})`;
  }
  return `${formatQty(baseQty)} ${baseUnit}`;
};
