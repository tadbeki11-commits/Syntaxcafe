import { useState, useEffect } from "react";
import api from "@/application";

export const useLoginPhase = () => {
  const [loginPhase, setLoginPhase] = useState<string>("admin");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  const loadEmployees = async () => {
    setEmployees([]);

    try {
      const usersResponse: any = await api.users.getAll();
      const usersList =
        usersResponse?.data?.data?.users ?? usersResponse?.data?.users ?? [];
      const normalized = (Array.isArray(usersList) ? usersList : [])
        .filter((u) => u && u.is_active !== false)
        .map((u) => ({
          ...u,
          full_name: u.full_name || u.name || u.username || "",
        }))
        .filter((u) => String(u.full_name || "").trim());

      const seen = new Set();
      const finalUsers = normalized.filter((u) => {
        const key = String(u.username || u.full_name || "")
          .trim()
          .toLowerCase();
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setEmployees(finalUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      try {
        const waitersResponse: any = await api.users.getWaiters();
        const usersList =
          waitersResponse?.data?.data?.users ??
          waitersResponse?.data?.users ??
          [];
        const normalized = (Array.isArray(usersList) ? usersList : [])
          .map((u) => ({
            ...u,
            full_name: u.full_name || u.name || u.username || "",
          }))
          .filter((u) => String(u.full_name || "").trim());
        setEmployees(normalized);
      } catch (e) {
        console.error("Error loading waiters:", e);
        setEmployees([]);
      }
    }
  };

  useEffect(() => {
    if (loginPhase === "user-selection") {
      loadEmployees();
    }
  }, [loginPhase]);

  // Pre-fetch users when online and listen for online events
  useEffect(() => {
    if (navigator.onLine) {
      loadEmployees();
    }
    const handleOnline = () => loadEmployees();
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);


  const selectUser = (user: any) => {
    setSelectedUser(user);
    setLoginPhase("pin-entry");
  };

  const goToAdminLogin = () => {
    setLoginPhase("admin");
  };

  const goBackToUserSelection = () => {
    setLoginPhase("user-selection");
    setSelectedUser(null);
  };

  return {
    loginPhase,
    setLoginPhase,
    selectedUser,
    setSelectedUser,
    employees,
    loadEmployees,
    selectUser,
    goToAdminLogin,
    goBackToUserSelection,
  };
};
