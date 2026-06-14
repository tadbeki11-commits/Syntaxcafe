/* eslint-disable @typescript-eslint/no-explicit-any */
export const normalizeStatus = (s: any) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .trim();

export const formatOrderItemsPreview = (items: any) => {
  const arr = Array.isArray(items) ? items : [];
  if (arr.length === 0) return "";
  const parts = arr
    .slice(0, 3)
    .map((it) => {
      const qty = parseInt(it.quantity, 10);
      const name = it.menu_item_name || it.name || "";
      if (!name) return null;
      return `${Number.isFinite(qty) ? qty : 1}x ${name}`;
    })
    .filter(Boolean);
  if (parts.length === 0) return "";
  const remaining = arr.length - 3;
  return remaining > 0
    ? `${parts.join(", ")} +${remaining} more`
    : parts.join(", ");
};
