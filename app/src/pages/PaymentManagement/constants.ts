export const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'info',
  deleted: 'secondary',
};
