import { useState, useEffect } from 'react';
import api from '@/application';
import toast from 'react-hot-toast';
import { getLocalDb, localDbTables } from '@/db/localDb';

export const useOrderData = (showCreateModal: boolean, user: any) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuMainCategoryById, setMenuMainCategoryById] = useState<{ [key: number]: string }>({});
  const [paidOrderIdSet, setPaidOrderIdSet] = useState<Set<string>>(new Set());
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<{ [key: number]: { name: string, role: string } }>({});

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        let response: any;

        if (user?.role === 'admin') {
          response = await api.orders.getAll();
        } else if (user?.role === 'kitchen_staff') {
          response = await api.orders.getKitchenOrders();
        } else {
          response = await api.orders.getAll({ employee_id: user?.id });
        }

        const payload = response?.data;
        const rawOrders = payload?.data?.orders || payload?.orders || payload?.data || payload || [];
        const sortedOrders = (Array.isArray(rawOrders) ? rawOrders : []).sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setOrders(sortedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchOrders();
    }
  }, [user?.id, user?.role]);

  // Fetch menu categories
  useEffect(() => {
    let cancelled = false;
    api.menu
      .getAll()
      .then((resp: any) => {
        if (cancelled) return;
        const payload = resp?.data;
        const items = payload?.data?.menuItems ?? payload?.menuItems ?? payload?.data ?? payload ?? [];
        if (!Array.isArray(items) || items.length === 0) return;
        const next: { [key: number]: string } = {};
        for (const it of items) {
          const id = it?.id != null ? it.id : null;
          if ((id === "")) continue;
          const main = String(it?.main_category || '').trim().toLowerCase();
          if (!main) continue;
          next[id as number] = main;
        }
        setMenuMainCategoryById(next);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch paid orders (for admin only)
  useEffect(() => {
    if (user?.role !== 'admin') {
      setPaidOrderIdSet(new Set());
      return;
    }

    let cancelled = false;
    api.payments
      .getAll()
      .then((resp: any) => {
        if (cancelled) return;
        const paymentsList = resp?.data?.data?.payments ?? resp?.data?.payments ?? [];
        const paid = (Array.isArray(paymentsList) ? paymentsList : [])
          .filter((p) => String(p?.status || '').trim().toLowerCase() === 'paid')
          .map((p) => (p?.order_id != null ? String(p.order_id) : null))
          .filter(Boolean) as string[];
        setPaidOrderIdSet(new Set(paid));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  // Fetch menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        let response: any;
        response = await api.menu.getAll();
        const payload = response?.data;
        const allItems = payload?.data?.menuItems || payload?.menuItems || payload?.data || payload || [];
        const available = (Array.isArray(allItems) ? allItems : []).filter((item: any) => item.is_available);
        setMenuItems(available);
      } catch (error) {
        console.error('Error fetching menu items:', error);
        toast.error('Failed to load menu items');
      }
    };

    if (showCreateModal) {
      fetchMenuItems();
    }
  }, [showCreateModal, user?.role]);

  // Fetch users map for resolving order employee names and roles
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const db = await getLocalDb();
        const userRows = await db.select({ raw_json: localDbTables.users.raw_json }).from(localDbTables.users);
        const usersList = userRows.map((row: any) => JSON.parse(row.raw_json));
        const next: { [key: number]: { name: string, role: string } } = {};
        for (const u of usersList) {
          if (u.id) {
            const name = [u.first_name, u.last_name]
              .filter(Boolean)
              .join(' ')
              .trim() || u.full_name || u.name || u.username || 'Employee';
            next[u.id] = { name, role: u.role || '' };
          }
        }
        setUsersMap(next);
      } catch (e) {
        console.error('Error fetching users map in useOrderData:', e);
      }
    };
    fetchUsers();
  }, []);

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await api.orders.updateStatus(orderId, {
        status: newStatus,
        updated_by: user?.id
      });

      toast.success(`Order ${newStatus} successfully`);

      const response = user?.role === 'admin'
        ? await api.orders.getAll()
        : await api.orders.getAll({ employee_id: user?.id });

      const payload = (response as any)?.data;
      const rawOrders = payload?.data?.orders || payload?.orders || payload?.data || payload || [];
      const sortedOrders = (Array.isArray(rawOrders) ? rawOrders : []).sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrders(sortedOrders);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  return {
    loading,
    orders,
    menuMainCategoryById,
    paidOrderIdSet,
    menuItems,
    usersMap,
    updateOrderStatus
  };
};
