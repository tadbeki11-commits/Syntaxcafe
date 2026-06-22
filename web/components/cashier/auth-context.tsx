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
  cashierLogin,
  cashierLogout,
  getCashierUser,
  type CashierUser,
} from "@/lib/cashier/auth";

interface CashierAuthContextValue {
  user: CashierUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (name: string, password: string) => Promise<CashierUser>;
  logout: () => void;
}

const CashierAuthContext = createContext<CashierAuthContextValue | null>(null);

export function CashierAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<CashierUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getCashierUser());
    setLoading(false);
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    const u = await cashierLogin(name, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    cashierLogout();
    setUser(null);
  }, []);

  return (
    <CashierAuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </CashierAuthContext.Provider>
  );
}

export function useCashierAuth(): CashierAuthContextValue {
  const ctx = useContext(CashierAuthContext);
  if (!ctx) {
    throw new Error("useCashierAuth must be used within a CashierAuthProvider");
  }
  return ctx;
}
