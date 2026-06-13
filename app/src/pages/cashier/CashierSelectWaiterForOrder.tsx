import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/application';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiArrowLeft, FiUser } from 'react-icons/fi';

export const SESSION_KEY = 'cashier_order_waiter_v1';

const CashierSelectWaiterForOrder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchWaiters = async () => {
      try {
        setLoading(true);
        const resp = await api.users.getWaiters();
        const list = (resp as any)?.data?.data?.users ?? (resp as any)?.data?.users ?? (resp as any)?.data?.waiters ?? [];
        const arr = Array.isArray(list) ? list : [];
        if (cancelled) return;
        setUsers(arr);
      } catch (e) {
        console.error('Failed to load waiters:', e);
        if (!cancelled) {
          toast.error('Failed to load waiters');
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWaiters();

    return () => {
      cancelled = true;
    };
  }, []);

  const waiters = useMemo(() => {
    const arr = Array.isArray(users) ? users : [];
    const onlyWaiters = arr.filter((u) => String(u?.role || '').toLowerCase().includes('waiter'));
    const list = onlyWaiters.length > 0 ? onlyWaiters : arr;

    const q = String(search || '').trim().toLowerCase();
    const filtered = !q
      ? list
      : list.filter((u) => {
          const name = String(u?.full_name || u?.name || u?.username || '').toLowerCase();
          const username = String(u?.username || '').toLowerCase();
          return name.includes(q) || username.includes(q);
        });

    return filtered
      .slice()
      .sort((a, b) => {
        const an = String(a?.full_name || a?.name || a?.username || '').toLowerCase();
        const bn = String(b?.full_name || b?.name || b?.username || '').toLowerCase();
        const nameCompare = an.localeCompare(bn);
        if (nameCompare !== 0) return nameCompare;
        return String(a?.id || '').localeCompare(String(b?.id || ''));
      });
  }, [users, search]);

  const handleSelect = (u: any) => {
    if (!u) return;

    const payload = {
      id: u.id,
      username: u.username,
      full_name: u.full_name || u.name || u.username,
      name: u.full_name || u.name || u.username,
      role: u.role,
      is_active: u.is_active !== false
    };

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }

    navigate('/dashboard/cashier/create-order', { state: { waiter: payload } });
  };

  if (loading) return <LoadingSpinner text="Loading waiters..." />;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 px-4 py-2 border border-border rounded-lg bg-background hover:bg-muted transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div>
            <h1 className="text-xl font-bold">Select Waiter</h1>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card">
          <div className="p-4 border-b border-border">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search waiter..."
              className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
            />
          </div>

          <div className="p-4">
            {waiters.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No waiters found</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {waiters.map((u) => {
                  const name = u?.full_name || u?.name || u?.username || 'Waiter';
                  const username = u?.username ? String(u.username) : '';
                  const inactive = u?.is_active === false;

                  return (
                    <button
                      key={u.id || name}
                      type="button"
                      onClick={() => handleSelect(u)}
                      disabled={inactive}
                      className={`text-left w-full rounded-lg border p-4 hover:bg-muted transition-colors ${
                        inactive 
                          ? 'opacity-50 cursor-not-allowed border-border bg-muted' 
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 rounded-full bg-muted">
                          <FiUser className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{name}</div>
                          {username && (
                            <div className="text-sm text-muted-foreground truncate">@{username}</div>
                          )}
                          {inactive && (
                            <div className="text-sm text-destructive mt-1">Inactive</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierSelectWaiterForOrder;
