"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Menu, Users } from "@/lib/resources";

type Dept = { slug: string; name: string };

/**
 * Row action for cashier accounts: attach the cashier to one or more departments
 * (menu "main categories"). A cashier scoped to departments only sees and settles
 * their share of incoming orders in the web cashier portal; leaving it empty lets
 * them settle whole orders. Stored on the user's meta via
 * PUT /users/:id/cashier-departments.
 */
export function CashierDepartmentsAction({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [depts, user] = await Promise.all([
          Menu.departments(),
          Users.get(userId),
        ]);
        if (!active) return;
        const list: Dept[] = (Array.isArray(depts) ? depts : [])
          .map((d: any) => ({
            slug: String(d?.slug || d?.name || "").trim().toLowerCase(),
            name: String(d?.name || d?.slug || "").trim(),
          }))
          .filter((d: Dept) => d.slug);
        setDepartments(list);
        const current: string[] = Array.isArray(user?.cashier_departments)
          ? user.cashier_departments
          : [];
        setSelected(new Set(current.map((s) => String(s).toLowerCase())));
      } catch (e: any) {
        toast.error(e?.message || "Failed to load departments");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, userId]);

  const toggle = useCallback((slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await Users.setCashierDepartments(userId, Array.from(selected));
      toast.success("Departments updated");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update departments");
    } finally {
      setSaving(false);
    }
  }, [userId, selected]);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Layers className="size-4" />
        Departments
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Departments — {userName}</DialogTitle>
            <DialogDescription>
              Attach this cashier to specific departments. They&apos;ll only see
              and confirm payment for their share of each order. Leave all
              unchecked to let them settle whole orders.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm font-medium">Loading…</span>
            </div>
          ) : departments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No departments found. Add menu main categories first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 py-2">
              {departments.map((d) => {
                const on = selected.has(d.slug);
                return (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => toggle(d.slug)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || loading}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
