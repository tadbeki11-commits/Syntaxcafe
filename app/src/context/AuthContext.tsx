import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/application';
import { isOnline } from '@/infrastructure/api/http-client';
import toast from 'react-hot-toast';
import {
  clearSessionUser,
  getSessionUser,
  setSessionUser,
  type SessionUser,
} from '@/shared/utils/sessionUser';
import {
  clearServerTimeOffset,
  setServerTimeOffset,
} from '@/shared/utils/serverTime';
import { clearAllLocalData } from '@/db/localDb';
import { syncEngine } from '@/infrastructure/sync/sync-engine';

export interface User {
  id: string | number;
  name?: string;
  role: string;
  is_active: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: any, loginType?: string, silent?: boolean) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (userId: string | number, profileData: any) => Promise<{ success: boolean; user?: User; error?: string }>;
  changePassword: (userId: string | number, currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isAdmin: () => boolean;
  getRoleDisplayName: (role?: string) => string;
  refreshServerTime: () => Promise<string | null>;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const refreshServerTime = useCallback(async (): Promise<string | null> => {
    if (!isOnline()) {
      return null;
    }

    try {
      const response = await api.auth.getServerTime();
      const data = response?.data || {};
      const serverTime = data.server_time || data?.data?.server_time;
      if (serverTime) {
        setServerTimeOffset(serverTime);
        return serverTime;
      }
    } catch (error) {
      console.warn('Failed to refresh server time:', error);
    }
    return null;
  }, []);

  // Initialize auth state from session storage
  useEffect(() => {
    try {
      const sessionUser = getSessionUser();
      if (sessionUser) {
        setUser(sessionUser as User);
        setIsAuthenticated(true);
        refreshServerTime();
      }
    } catch (error) {
      console.error('Error initializing auth session:', error);
      clearSessionUser();
    } finally {
      setLoading(false);
    }
  }, [refreshServerTime]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshServerTime();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, refreshServerTime]);

  // Login function
  const login = async (credentials: any, loginType = 'traditional', silent = true) => {
    try {
      setLoading(true);
      
      let response: any;
      if (loginType === 'pin') {
        response = await api.auth.pinLogin(credentials);
      } else if (loginType === 'staff') {
        response = await api.auth.staffLogin(credentials);
      } else {
        response = await api.auth.login(credentials);
      }
      
      console.log('🔐 Login response:', response);
      const data = response?.data || {};

      const isSuccess = data.status === 'success' || data.success === true;
      const userData = data?.data?.user || data?.user;
      
      if (isSuccess && userData) {
        if (data.server_time) {
          setServerTimeOffset(data.server_time);
        } else {
          clearServerTimeOffset();
          await refreshServerTime();
        }

        setUser(userData);
        setIsAuthenticated(true);
        setSessionUser(userData as SessionUser);

        // Clear local data, then fetch and cache system settings and trigger full sync
        try {
          await clearAllLocalData();
          await api.settings.syncAllSystemSettings();
          await syncEngine.sync();
        } catch (settingsError) {
          console.warn('Failed to sync system settings on login:', settingsError);
        }

        return { success: true, user: userData };
      }
      
      const message = data.message || data.error || 'Login failed';
      console.log('❌ Login failed:', message);
      if (!silent) {
        toast.error(message);
      }
      return { success: false, error: message };
    } catch (error: any) {
      console.error('💥 Login error:', error);
      const message = error.response?.data?.message || error.response?.data?.error || 'Login failed';
      if (!silent) {
        toast.error(message);
      }
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData: any) => {
    try {
      setLoading(true);
      const response = await api.auth.register(userData);
      
      if (response.data.status === 'success') {
        toast.success('Registration successful! Please login.');
        return { success: true };
      }
      return { success: false };
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      clearSessionUser();
      clearServerTimeOffset();
      await clearAllLocalData();
    } catch (e) {
      // ignore
    }

    try {
      api.auth.logout().catch((error: any) => {
        console.error('Logout error:', error);
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    toast.success('Logged out successfully');
  };

  // Update user profile
  const updateProfile = async (userId: string | number, profileData: any) => {
    if (!isOnline()) {
      const msg = 'Profile updates are disabled when the application is offline.';
      toast.error(msg);
      return { success: false, error: msg };
    }
    try {
      const response = await api.auth.updateProfile(userId, profileData);
      
      if (response.data.status === 'success') {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        setSessionUser(updatedUser as SessionUser);
        toast.success('Profile updated successfully');
        return { success: true, user: updatedUser };
      }
      return { success: false, error: 'Failed' };
    } catch (error: any) {
      console.error('Profile update error:', error);
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (userId: string | number, currentPassword: string, newPassword: string) => {
    if (!isOnline()) {
      const msg = 'Password/PIN changes are disabled when the application is offline.';
      toast.error(msg);
      return { success: false, error: msg };
    }
    try {
      const response = await api.auth.changePassword(userId, {
        current_password: currentPassword,
        new_password: newPassword,
      });

      const data = response?.data || {};
      const isSuccess = data.status === 'success' || data.success === true;
      if (isSuccess) {
        toast.success(data.message || 'Password updated successfully');
        return { success: true };
      }

      const message = data.message || data.error || 'Failed to update password';
      toast.error(message);
      return { success: false, error: message };
    } catch (error: any) {
      console.error('Change password error:', error);
      const message = error.response?.data?.message || error.response?.data?.error || 'Failed to update password';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Check if user has specific role
  const hasRole = (role: string) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: string[]) => {
    return roles.includes(user?.role || '');
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // Get user's role display name
  const getRoleDisplayName = (role: string | undefined = user?.role) => {
    const roleNames: Record<string, string> = {
      admin: 'Administrator',
      cafe_waiter: 'Café Waiter',
      cashier: 'Cashier',
      kitchen_staff: 'Kitchen Staff'
    };
    return roleNames[role || ''] || role || '';
  };

  // Context value
  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    hasRole,
    hasAnyRole,
    isAdmin,
    getRoleDisplayName,
    refreshServerTime,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
