"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users } from "@/lib/resources";
import { CONFIGURABLE_ROLES } from "@/lib/permissions";

/**
 * Row action giving the owner full control over a staff account: change their
 * role and reset their login. The reset path does NOT require the staff member's
 * current secret (they may have forgotten it) — it's authorized by the owner's
 * branch-scoped session via POST /users/:id/reset-password, while the role goes
 * through PATCH /users/:id/role.
 */
export function ManageAccessAction({
  userId,
  userName,
  currentRole,
  onSaved,
}: {
  userId: string;
  userName: string;
  currentRole: string;
  onSaved: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState(currentRole);
  const [authMode, setAuthMode] = useState<"password" | "pin">("password");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  // Reset the form each time the dialog opens so stale input never leaks across
  // staff rows.
  useEffect(() => {
    if (!open) return;
    setRole(currentRole);
    setAuthMode("password");
    setPassword("");
    setPin("");
  }, [open, currentRole]);

  async function save() {
    const roleChanged = role && role !== currentRole;
    const resettingLogin = authMode === "password" ? !!password : !!pin;

    if (!roleChanged && !resettingLogin) {
      toast.error("Change the role or enter a new password/PIN first");
      return;
    }
    if (authMode === "password" && password && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (authMode === "pin" && pin && !/^\d{4}$/.test(pin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    setSaving(true);
    try {
      if (roleChanged) {
        await Users.changeRole(userId, role);
      }
      if (resettingLogin) {
        await Users.resetPassword(
          userId,
          authMode === "password" ? { password } : { pin },
        );
      }
      toast.success("Access updated");
      setOpen(false);
      await onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update access");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" />
        Manage access
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage access — {userName}</DialogTitle>
            <DialogDescription>
              Change this employee&apos;s role and reset their login. Leave the
              password and PIN blank to keep their current login unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {/* Keep the current role selectable even if it isn't a
                    configurable one (e.g. a legacy role). */}
                {!CONFIGURABLE_ROLES.some((r) => r.value === currentRole) &&
                currentRole ? (
                  <option value={currentRole}>{currentRole}</option>
                ) : null}
                {CONFIGURABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Reset login</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={authMode === "password" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setAuthMode("password");
                    setPin("");
                  }}
                >
                  Password
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={authMode === "pin" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setAuthMode("pin");
                    setPassword("");
                  }}
                >
                  4-Digit PIN
                </Button>
              </div>
              {authMode === "password" ? (
                <Input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              ) : (
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="New 4-digit PIN"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
