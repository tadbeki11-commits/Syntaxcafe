export const formatAmount = (value: unknown): string => {
  const n = parseFloat(String(value));
  return (Number.isFinite(n) ? n : 0).toFixed(2);
};
