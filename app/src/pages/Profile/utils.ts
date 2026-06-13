export const isDesktopRuntime = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const ua = String(window.navigator?.userAgent || '').toLowerCase();
    const w: any = window;
    return !!(w.__TAURI__ || w.__TAURI_INTERNALS__ || w.__TAURI_METADATA__ || w.__TAURI_IPC__ || ua.includes('tauri'));
  } catch {
    return false;
  }
};

export const getRoleVariant = (role: string | undefined): 'default' | 'success' | 'warning' | 'destructive' | 'info' => {
  const variants: { [key: string]: 'default' | 'success' | 'warning' | 'destructive' | 'info' } = {
    admin: 'default',
    cafe_waiter: 'info',
    cashier: 'success',
    kitchen_staff: 'destructive'
  };
  return variants[role || ''] || 'default';
};
