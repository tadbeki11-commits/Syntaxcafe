"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { Menu, Tables, Orders, Organizations } from "@/lib/resources";
import { getUser } from "@/lib/auth";
import { birr } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  price: string | null;
  category: string | null;
  main_category: string | null;
};
type Category = { id: string; name: string; slug: string };
type Line = { item: Item; qty: number };

export default function NewOrderPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("all");
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  // Synchronous lock so a double-click can't fire two order creations before
  // `placing` re-renders the button to disabled.
  const submitLockRef = useRef(false);
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      Menu.items(),
      Tables.list().catch(() => []),
      Menu.categories().catch(() => []),
    ])
      .then(([m, t, c]) => {
        setItems(m.filter((i: any) => i.is_available !== false));
        setTables(t);
        setCategories(c);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

    // When launched from an organization's account, attach the order to it.
    const org = new URLSearchParams(window.location.search).get("org");
    if (org) {
      setOrgId(org);
      Organizations.get(org)
        .then((o) => setOrgName(o?.name ?? null))
        .catch(() => {});
    }
  }, []);

  function add(item: Item) {
    setCart((c) => {
      const existing = c[item.id];
      return { ...c, [item.id]: { item, qty: (existing?.qty ?? 0) + 1 } };
    });
  }
  function setQty(id: string, qty: number) {
    setCart((c) => {
      if (qty <= 0) {
        const { [id]: _, ...rest } = c;
        return rest;
      }
      return { ...c, [id]: { ...c[id], qty } };
    });
  }

  const lines = Object.values(cart);
  const total = useMemo(
    () => lines.reduce((s, l) => s + Number(l.item.price || 0) * l.qty, 0),
    [lines],
  );

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) &&
      (category === "all" || i.category === category),
  );

  // Only offer categories that actually have available items, plus "All".
  const usedCategories = useMemo(() => {
    const present = new Set(
      items.map((i) => (i.category || "").trim()).filter(Boolean),
    );
    return categories.filter((c) => present.has(c.name));
  }, [items, categories]);

  async function placeOrder() {
    if (lines.length === 0) {
      toast.error("Add at least one item.");
      return;
    }
    if (submitLockRef.current || placing) return;
    submitLockRef.current = true;
    setPlacing(true);
    try {
      await Orders.create({
        employee_id: getUser()?.id,
        type: "cafe",
        organization_id: orgId,
        table_number: tableNumber ? Number(tableNumber) : null,
        notes: notes || null,
        total_amount: total,
        items: lines.map((l) => ({
          menu_item_id: l.item.id,
          quantity: l.qty,
          unit_price: Number(l.item.price || 0),
          main_category: l.item.main_category,
          item_type: "food",
        })),
      });
      toast.success("Order placed");
      router.push(orgId ? `/dashboard/customers/${orgId}` : "/dashboard/orders");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      submitLockRef.current = false;
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/orders">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title="New Order"
          description={
            orgName
              ? `Order on the account of ${orgName}.`
              : "Build an order for this branch."
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Menu picker */}
        <Card>
          <CardHeader>
            <CardTitle>Menu</CardTitle>
            <Input
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2"
            />
            {usedCategories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setCategory("all")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    category === "all"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}>
                  All
                </button>
                {usedCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.name)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      category === c.name
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No available menu items.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filtered.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => add(it)}
                    className="hover:border-primary hover:bg-primary/5 flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors">
                    <span className="line-clamp-2 text-sm font-medium">{it.name}</span>
                    <span className="text-muted-foreground text-xs">{birr(it.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart */}
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Tap items to add them.
              </p>
            ) : (
              <div className="space-y-3">
                {lines.map((l) => (
                  <div key={l.item.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{l.item.name}</div>
                      <div className="text-muted-foreground text-xs">{birr(l.item.price)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="size-7" onClick={() => setQty(l.item.id, l.qty - 1)}>
                        <MinusIcon className="size-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{l.qty}</span>
                      <Button variant="outline" size="icon" className="size-7" onClick={() => setQty(l.item.id, l.qty + 1)}>
                        <PlusIcon className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setQty(l.item.id, 0)}>
                        <Trash2Icon className="text-destructive size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Table (optional)</Label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}>
                <option value="">No table</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.table_number}>Table {t.table_number}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-muted-foreground text-sm">Total</span>
              <span className="text-lg font-semibold">{birr(total)}</span>
            </div>
            <Button className="w-full" onClick={placeOrder} disabled={placing || lines.length === 0}>
              {placing ? "Placing…" : "Place order"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
