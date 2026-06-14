"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getWaiterUser,
  waiterLogin,
  waiterLogout,
  type WaiterUser,
} from "@/lib/waiter/auth";

interface WaiterAuthContextValue {
  user: WaiterUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<WaiterUser>;
  logout: () => void;
}

const WaiterAuthContext = createContext<WaiterAuthContextValue | null>(null);

export function WaiterAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<WaiterUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getWaiterUser());
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await waiterLogin(username, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    waiterLogout();
    setUser(null);
  }, []);

  return (
    <WaiterAuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </WaiterAuthContext.Provider>
  );
}

export function useWaiterAuth(): WaiterAuthContextValue {
  const ctx = useContext(WaiterAuthContext);
  if (!ctx) {
    throw new Error("useWaiterAuth must be used within a WaiterAuthProvider");
  }
  return ctx;
}
