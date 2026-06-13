export interface UserItem {
  id: number;
  full_name: string;
  username: string;
  role: string;
  is_active: boolean;
  cancel_password?: string | null;
  created_at: string;
}

export interface UserFormData {
  full_name: string;
  username: string;
  password?: string;
  pin?: string;
  cancel_password?: string;
  role: string;
  is_active: boolean;
}

export interface SyncStatusData {
  online: boolean;
  syncing: boolean;
  unsyncedCount: number;
}

export interface RoleOption {
  id: number;
  name: string;
  display_name: string;
  is_active: boolean;
}
