import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import api from '@/application';

interface CartItem {
  menu_item_id: string;
  menu_item_name: string;
  price: number;
  main_category: string;
  quantity: number;
}

const extractMenuItems = (response: any): any[] => {
  const payload = response?.data;
  const candidates = [
    payload?.data?.menuItems,
    payload?.menuItems,
    payload?.data?.items,
    payload?.items,
    payload?.data,
    payload,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

export const CreateOrgOrder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth() as any;

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [overrideTotal, setOverrideTotal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Synchronous lock so a double-click can't fire two order creations before
  // `submitting` re-renders the button to disabled.
  const submitLockRef = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [orgRes, menuRes] = await Promise.allSettled([
        api.organizations.getById(id),
        api.menu.getCafeMenu(),
      ]);

      if (orgRes.status === 'fulfilled') {
        setOrganization(
          (orgRes.value as any)?.data?.data?.organization ?? null,
        );
      }

      let items: any[] = [];
      if (menuRes.status === 'fulfilled') {
        items = extractMenuItems(menuRes.value);
      }
      if (items.length === 0) {
        const fallback = await api.menu.getAll();
        items = extractMenuItems(fallback);
      }
      const normalized = items
        .map((item) => ({
          ...item,
          main_category:
            item.meta?.main_category || item.main_category || 'barista',
          is_available:
            typeof item.is_available === 'boolean'
              ? item.is_available
              : (item.available ?? true),
        }))
        .filter((item) => item.is_available);
      setMenuItems(normalized);
    } catch (error) {
      console.error('[CreateOrgOrder] load failed', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return menuItems;
    return menuItems.filter((item) =>
      String(item.name || '').toLowerCase().includes(term),
    );
  }, [menuItems, search]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          menu_item_name: item.name,
          price: Number(item.price) || 0,
          main_category: item.main_category || 'barista',
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (menuItemId: string, change: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menu_item_id === menuItemId
            ? { ...c, quantity: c.quantity + change }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const computedTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.price * c.quantity, 0),
    [cart],
  );

  const effectiveTotal = useMemo(() => {
    const override = parseFloat(overrideTotal);
    return Number.isFinite(override) && overrideTotal.trim() !== ''
      ? override
      : computedTotal;
  }, [overrideTotal, computedTotal]);

  const hasOverride =
    overrideTotal.trim() !== '' && Number.isFinite(parseFloat(overrideTotal));

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    if (!id) return;
    if (submitLockRef.current || submitting) return;
    submitLockRef.current = true;
    try {
      setSubmitting(true);
      const orderData: any = {
        employee_id: user.id,
        created_by_id: user.id,
        type: 'cafe',
        organization_id: Number(id),
        is_price_override: hasOverride,
        order_type_label: organization?.name
          ? `Org: ${organization.name}`
          : 'Organization',
        items: cart.map((c) => {
          const isBeverage = c.main_category === 'barista';
          return {
            menu_item_id: c.menu_item_id,
            menu_item_name: c.menu_item_name,
            quantity: c.quantity,
            unit_price: c.price,
            subtotal: c.price * c.quantity,
            main_category: c.main_category,
            item_type: isBeverage ? 'beverage' : 'food',
          };
        }),
        total_amount: effectiveTotal,
      };

      await api.orders.create(orderData);
      toast.success('Organization order created');
      navigate(`/dashboard/organizations/${id}`);
    } catch (error: any) {
      console.error('[CreateOrgOrder] submit failed', error);
      const message =
        error?.response?.data?.message ||
        'Failed to create order. Check inventory or try again.';
      toast.error(message);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Create Organization Order"
        description={
          organization?.name
            ? `Bulk order for ${organization.name}`
            : 'Bulk order'
        }
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/organizations/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Menu</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">
                Loading menu...
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="text-left rounded-lg border p-3 hover:border-primary hover:bg-accent transition-colors"
                  >
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(item.price || 0).toLocaleString()} Birr
                    </p>
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <p className="text-muted-foreground col-span-full text-center py-8">
                    No items found.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                No items added.
              </p>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div
                    key={c.menu_item_id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.menu_item_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(c.price * c.quantity).toLocaleString()} Birr
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQty(c.menu_item_id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">
                        {c.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQty(c.menu_item_id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items subtotal</span>
                <span>{computedTotal.toLocaleString()} Birr</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="override-total">
                  Negotiated total (override)
                </Label>
                <Input
                  id="override-total"
                  type="number"
                  min={0}
                  value={overrideTotal}
                  onChange={(e) => setOverrideTotal(e.target.value)}
                  placeholder="Leave blank to use subtotal"
                />
                <p className="text-xs text-muted-foreground">
                  As admin you can set the final price for this bulk order.
                </p>
              </div>

              <div className="flex justify-between font-semibold">
                <span>Order total</span>
                <span>
                  {effectiveTotal.toLocaleString()} Birr
                  {hasOverride && (
                    <span className="ml-1 text-xs font-normal text-primary">
                      (custom)
                    </span>
                  )}
                </span>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
              >
                {submitting ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateOrgOrder;
