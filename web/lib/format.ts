export function birr(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
