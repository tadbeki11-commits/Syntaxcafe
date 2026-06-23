"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRoundIcon, SlidersHorizontalIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Settings } from "@/lib/resources";
import { getBranchId } from "@/lib/api";

// Each toggle maps to one per-branch system_settings key on the backend.
// `value` is the raw stored boolean; `enabled` is what the switch shows (some
// keys read inverted so the UI label stays positive, e.g. "allow orders without
// a table" is stored as force_table_selection).
type Rule = {
  key: string;
  title: string;
  description: string;
  load: () => Promise<boolean>;
  save: (enabled: boolean) => Promise<unknown>;
};

const RULES: Rule[] = [
  {
    key: "force_table_selection",
    title: "Allow orders without a table",
    description:
      "When on, staff can create an order without assigning it to a table (takeaway / counter). Turn off to require a table on every order.",
    load: () =>
      Settings.tableSelection().then((d) => !d.force_table_selection),
    save: (enabled) =>
      Settings.updateTableSelection({ force_table_selection: !enabled }),
  },
  {
    key: "allow_low_stock_orders",
    title: "Allow orders with low inventory",
    description:
      "When on, items can still be ordered after their ingredients run low. Turn off to block ordering items that are out of stock.",
    load: () => Settings.inventory().then((d) => d.allow_low_stock_orders),
    save: (enabled) =>
      Settings.updateInventory({ allow_low_stock_orders: enabled }),
  },
  {
    key: "show_menu_inventory_availability",
    title: "Show inventory availability to waiters",
    description:
      "When on, the waiter order screen flags each menu item as out of stock or running low based on current ingredient inventory. Turn off to hide stock hints from waiters.",
    load: () =>
      Settings.menuAvailability().then(
        (d) => d.show_menu_inventory_availability,
      ),
    save: (enabled) =>
      Settings.updateMenuAvailability({
        show_menu_inventory_availability: enabled,
      }),
  },
  {
    key: "allow_cashier_manage_org_orders",
    title: "Cashiers can manage organization orders",
    description:
      "When on, cashiers (not just admins) can create and settle credit orders for organizations.",
    load: () =>
      Settings.organizations().then((d) => d.allow_cashier_manage_org_orders),
    save: (enabled) =>
      Settings.updateOrganizations({
        allow_cashier_manage_org_orders: enabled,
      }),
  },
  {
    key: "enable_cashier_receipt",
    title: "Print cashier receipt",
    description:
      "When on, a receipt is printed at the cashier station when an order is paid.",
    load: () => Settings.receipt().then((d) => d.enable_cashier_receipt),
    save: (enabled) =>
      Settings.updateReceipt({ enable_cashier_receipt: enabled }),
  },
];

// Branch cancel-order override password. Mirrors the desktop admin's "Cancel
// Order Password" card: staff are prompted for this password before cancelling
// an order. We only ever learn whether one is set, never its value.
function CancelPasswordCard() {
  const [isSet, setIsSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Settings.cancelPassword()
      .then((d) => setIsSet(!!d.is_set))
      .catch((e: any) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await Settings.updateCancelPassword(password);
      setIsSet(true);
      setPassword("");
      setConfirm("");
      toast.success("Cancel password updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="size-5" />
          Cancel order password
        </CardTitle>
        <CardDescription>
          Staff must enter this password to cancel an order on the POS.{" "}
          {!loading &&
            (isSet
              ? "A password is currently set. Enter a new one to change it."
              : "No password is set yet for this branch.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-9 w-full max-w-sm" />
          </div>
        ) : (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newCancelPassword">New password</Label>
              <Input
                id="newCancelPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmCancelPassword">Confirm password</Label>
              <Input
                id="confirmCancelPassword"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={saving}
              />
            </div>
            {error && (
              <p className="text-destructive text-sm font-medium sm:col-span-2">
                {error}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving || !password}>
                {saving
                  ? "Saving…"
                  : isSet
                    ? "Update password"
                    : "Set password"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function PreferencesPage() {
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [hasBranch, setHasBranch] = useState(true);

  const load = useCallback(async () => {
    if (!getBranchId()) {
      setHasBranch(false);
      setLoading(false);
      return;
    }
    setHasBranch(true);
    setLoading(true);
    try {
      const entries = await Promise.all(
        RULES.map(async (r) => [r.key, await r.load()] as const),
      );
      setValues(Object.fromEntries(entries));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(rule: Rule, next: boolean) {
    // Optimistic: flip immediately, roll back on failure.
    setValues((v) => ({ ...v, [rule.key]: next }));
    setSaving(rule.key);
    try {
      await rule.save(next);
      toast.success("Saved");
    } catch (e: any) {
      setValues((v) => ({ ...v, [rule.key]: !next }));
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order Rules"
        description="Per-branch POS behavior. These apply to the branch selected in the switcher above."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontalIcon className="size-5" />
            Branch behavior
          </CardTitle>
          <CardDescription>
            Changes take effect on the desktop POS after its next sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {!hasBranch && (
            <p className="text-muted-foreground py-6 text-sm">
              Select a branch in the switcher above to configure its rules.
            </p>
          )}

          {hasBranch &&
            loading &&
            RULES.map((r) => (
              <div key={r.key} className="flex items-center gap-4 py-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))}

          {hasBranch &&
            !loading &&
            RULES.map((r, i) => (
              <div
                key={r.key}
                className={`flex items-start justify-between gap-4 py-4 ${
                  i > 0 ? "border-t" : ""
                }`}>
                <div className="space-y-1">
                  <div className="text-sm font-medium">{r.title}</div>
                  <p className="text-muted-foreground text-sm">
                    {r.description}
                  </p>
                </div>
                <Switch
                  className="mt-1"
                  checked={values[r.key] ?? false}
                  disabled={saving === r.key}
                  onCheckedChange={(v) => toggle(r, v)}
                />
              </div>
            ))}
        </CardContent>
      </Card>

      {hasBranch && <CancelPasswordCard />}
    </div>
  );
}
