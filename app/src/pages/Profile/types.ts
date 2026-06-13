export interface ProfileFormData {
  full_name: string;
  username: string;
}

export interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CancelPasswordFormData {
  newCancelPassword: string;
  confirmCancelPassword: string;
}

export interface SyncFormData {
  enabled: boolean;
  remoteUrl: string;
  intervalMs: number;
  token: string;
}

export interface SyncMetaData {
  hasToken: boolean;
  currentSyncing: boolean;
  lastAttemptAt: string;
  lastSuccessAt: string;
  lastError: string;
  lastResponseStatus: number | null;
  hasPendingChanges: boolean;
}
