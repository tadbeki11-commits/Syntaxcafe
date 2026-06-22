import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/application';
import { isOnline } from '@/infrastructure/api/http-client';
import toast from 'react-hot-toast';
import { ProfileFormData, PasswordFormData, CancelPasswordFormData, SyncFormData, SyncMetaData } from '../types';
import { INITIAL_PASSWORD_FORM, INITIAL_CANCEL_PASSWORD_FORM, INITIAL_SYNC_FORM, INITIAL_SYNC_META } from '../constants';
import { isDesktopRuntime } from '../utils';

export const useProfileData = () => {
  const { user, updateProfile, changePassword, getRoleDisplayName, logout } = useAuth();
  const navigate = useNavigate();

  const [online, setOnline] = useState(isOnline());
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({ ...INITIAL_PASSWORD_FORM });
  const [passwordErrors, setPasswordErrors] = useState<any>({});
  const [cancelPasswordForm, setCancelPasswordForm] = useState<CancelPasswordFormData>({ ...INITIAL_CANCEL_PASSWORD_FORM });
  const [cancelPasswordErrors, setCancelPasswordErrors] = useState<any>({});

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkInterval = setInterval(() => {
      setOnline(isOnline());
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, []);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: user?.full_name || '',
    username: user?.username || ''
  });
  const [errors, setErrors] = useState<any>({});

  const [syncForm, setSyncForm] = useState<SyncFormData>({ ...INITIAL_SYNC_FORM });
  const [syncMeta, setSyncMeta] = useState<SyncMetaData>({ ...INITIAL_SYNC_META });
  const [remoteStatus, setRemoteStatus] = useState<any>(null);
  const [syncBusy, setSyncBusy] = useState('');

  const isWaiter = false;
  const isAdmin = user?.role === 'admin';
  const hasDesktop = isDesktopRuntime();

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        username: user.username || ''
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors((prev: any) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const result = await updateProfile(user.id, formData);
      if (result.success) {
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      username: user?.username || ''
    });
    setErrors({});
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      // ignored
    }
  };

  const handlePasswordFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev: any) => ({ ...prev, [name]: '' }));
    }
  };

  const validatePasswordForm = () => {
    const newErrors: any = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = isWaiter ? 'Current PIN is required' : 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = isWaiter ? 'New PIN is required' : 'New password is required';
    } else {
      if (isWaiter) {
        if (!/^\d{4}$/.test(passwordForm.newPassword)) {
          newErrors.newPassword = 'PIN must be exactly 4 digits';
        }
      } else if (passwordForm.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
    }

    if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      newErrors.confirmPassword = isWaiter ? 'PIN confirmation does not match' : 'Password confirmation does not match';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitPasswordChange = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validatePasswordForm()) return;
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const result = await changePassword(user.id, passwordForm.currentPassword, passwordForm.newPassword);
      if (result.success) {
        setShowChangePassword(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePasswordDialog = () => {
    if (isLoading) return;
    setShowChangePassword(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
  };

  const handleCancelPasswordFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCancelPasswordForm(prev => ({ ...prev, [name]: value }));
    if (cancelPasswordErrors[name]) {
      setCancelPasswordErrors((prev: any) => ({ ...prev, [name]: '' }));
    }
  };

  const validateCancelPasswordForm = () => {
    const newErrors: any = {};

    if (!cancelPasswordForm.newCancelPassword) {
      newErrors.newCancelPassword = 'Cancel password is required';
    } else if (cancelPasswordForm.newCancelPassword.length < 6) {
      newErrors.newCancelPassword = 'Cancel password must be at least 6 characters';
    }

    if (cancelPasswordForm.confirmCancelPassword !== cancelPasswordForm.newCancelPassword) {
      newErrors.confirmCancelPassword = 'Confirmation does not match';
    }

    setCancelPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitCancelPasswordChange = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;
    if (!validateCancelPasswordForm()) return;
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await api.settings.updateCancelPassword(cancelPasswordForm.newCancelPassword);
      const result = (response as any)?.data || {};
      if (result.status === 'success' || result.success === true) {
        toast.success('Cancel password updated successfully!');
        setCancelPasswordForm({ newCancelPassword: '', confirmCancelPassword: '' });
        setCancelPasswordErrors({});
      } else {
        toast.error(result.message || result.error || 'Failed to update cancel password.');
      }
    } catch (error) {
      console.error('Cancel password update error:', error);
      toast.error('Failed to update cancel password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseCancelPasswordForm = () => {
    if (isLoading) return;
    setCancelPasswordForm({ newCancelPassword: '', confirmCancelPassword: '' });
    setCancelPasswordErrors({});
  };

  useEffect(() => {
    if (!isAdmin || !hasDesktop) return;

    const loadSyncState = async () => {
      try {
        const configResponse = await api.sync.getConfig();
        const syncData = (configResponse as any)?.data?.data || {};
        setSyncForm((prev) => ({
          ...prev,
          enabled: !!syncData.enabled,
          remoteUrl: syncData.remoteUrl || '',
          intervalMs: syncData.intervalMs || 30000,
          token: '',
        }));
        setSyncMeta({
          hasToken: !!syncData.hasToken,
          currentSyncing: !!syncData.currentSyncing,
          lastAttemptAt: syncData.lastAttemptAt || '',
          lastSuccessAt: syncData.lastSuccessAt || '',
          lastError: syncData.lastError || '',
          lastResponseStatus: syncData.lastResponseStatus ?? null,
          hasPendingChanges: !!syncData.hasPendingChanges,
        });
      } catch (error) {
        console.error('Failed to load sync config:', error);
      }
    };

    loadSyncState();
  }, [isAdmin, hasDesktop]);

  const refreshRemoteStatus = async () => {
    setSyncBusy('remote-status');
    try {
      const response = await api.sync.getRemoteStatus();
      setRemoteStatus((response as any)?.data || null);
      if ((response as any)?.data?.success) {
        toast.success('Hosted domain is reachable.');
      } else {
        toast.error((response as any)?.data?.error || 'Unable to reach hosted domain.');
      }
    } catch (error) {
      console.error('Remote status error:', error);
      toast.error('Failed to check hosted domain.');
    } finally {
      setSyncBusy('');
    }
  };

  const saveSyncConfig = async () => {
    setSyncBusy('save-sync');
    try {
      const payload: any = {
        enabled: !!syncForm.enabled,
        remoteUrl: syncForm.remoteUrl,
        intervalMs: syncForm.intervalMs,
      };
      if (syncForm.token.trim()) {
        payload.token = syncForm.token.trim();
      }
      const response = await api.sync.updateConfig(payload);
      const syncData = (response as any)?.data?.data || {};
      setSyncMeta({
        hasToken: !!syncData.hasToken,
        currentSyncing: !!syncData.currentSyncing,
        lastAttemptAt: syncData.lastAttemptAt || '',
        lastSuccessAt: syncData.lastSuccessAt || '',
        lastError: syncData.lastError || '',
        lastResponseStatus: syncData.lastResponseStatus ?? null,
        hasPendingChanges: !!syncData.hasPendingChanges,
      });
      setSyncForm((prev) => ({ ...prev, token: '' }));
      toast.success('Desktop sync settings saved.');
    } catch (error) {
      console.error('Save sync config error:', error);
      toast.error('Failed to save sync settings.');
    } finally {
      setSyncBusy('');
    }
  };

  const runSyncAction = async (action: string) => {
    setSyncBusy(action);
    try {
      const response = action === 'push'
        ? await api.sync.pushRemote(true)
        : await api.sync.pullRemote();
      const result = (response as any)?.data || {};
      if (result.success) {
        toast.success(action === 'push' ? 'Desktop data pushed to hosted domain.' : 'Hosted domain data pulled to desktop.');
      } else {
        toast.error(result.error || 'Sync action failed.');
      }

      const configResponse = await api.sync.getConfig();
      const syncData = (configResponse as any)?.data?.data || {};
      setSyncMeta({
        hasToken: !!syncData.hasToken,
        currentSyncing: !!syncData.currentSyncing,
        lastAttemptAt: syncData.lastAttemptAt || '',
        lastSuccessAt: syncData.lastSuccessAt || '',
        lastError: syncData.lastError || '',
        lastResponseStatus: syncData.lastResponseStatus ?? null,
        hasPendingChanges: !!syncData.hasPendingChanges,
      });
    } catch (error) {
      console.error('Sync action error:', error);
      toast.error('Failed to run sync action.');
    } finally {
      setSyncBusy('');
    }
  };

  return {
    online,
    user,
    getRoleDisplayName,
    isWaiter,
    isAdmin,
    hasDesktop,
    isEditing,
    setIsEditing,
    isLoading,
    showChangePassword,
    setShowChangePassword,
    passwordForm,
    setPasswordForm,
    passwordErrors,
    cancelPasswordForm,
    cancelPasswordErrors,
    formData,
    setFormData,
    errors,
    syncForm,
    setSyncForm,
    syncMeta,
    remoteStatus,
    syncBusy,
    handleChange,
    handleSubmit,
    handleCancel,
    handleLogout,
    handlePasswordFieldChange,
    submitPasswordChange,
    handleClosePasswordDialog,
    handleCancelPasswordFieldChange,
    submitCancelPasswordChange,
    handleCloseCancelPasswordForm,
    refreshRemoteStatus,
    saveSyncConfig,
    runSyncAction
  };
};

export default useProfileData;
