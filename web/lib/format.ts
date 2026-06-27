export function birr(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// Unified display vocabulary for order + payment status across the app. Maps the
// canonical axes — orders.status {pending, done, cancelled}, payment_status &
// payments.status {pending, paid, cancelled} — onto display labels:
//   deleted  → cancelled order or voided payment (legacy voided/refunded too)
//   paid     → confirmed payment / paid order
//   done     → fulfilled/served order (lifecycle)
//   pending  → anything still in process
export type DisplayStatus = "deleted" | "pending" | "paid" | "done";

export function displayStatus(status?: string | null): DisplayStatus {
  const s = String(status ?? "").trim().toLowerCase();
  if (["cancelled", "canceled", "voided", "deleted", "refunded"].includes(s))
    return "deleted";
  if (["paid", "completed"].includes(s)) return "paid";
  if (["done", "ready", "served"].includes(s)) return "done";
  return "pending";
}

export function statusBadgeVariant(
  status?: string | null,
): "success" | "warning" | "destructive" {
  const d = displayStatus(status);
  if (d === "paid" || d === "done") return "success";
  if (d === "deleted") return "destructive";
  return "warning";
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
