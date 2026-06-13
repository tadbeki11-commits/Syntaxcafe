import { PasswordFormData, CancelPasswordFormData, SyncFormData, SyncMetaData } from './types';

export const INITIAL_PASSWORD_FORM: PasswordFormData = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

export const INITIAL_CANCEL_PASSWORD_FORM: CancelPasswordFormData = {
  newCancelPassword: '',
  confirmCancelPassword: '',
};

export const INITIAL_SYNC_FORM: SyncFormData = {
  enabled: false,
  remoteUrl: '',
  intervalMs: 30000,
  token: ''
};

export const INITIAL_SYNC_META: SyncMetaData = {
  hasToken: false,
  currentSyncing: false,
  lastAttemptAt: '',
  lastSuccessAt: '',
  lastError: '',
  lastResponseStatus: null,
  hasPendingChanges: false
};
