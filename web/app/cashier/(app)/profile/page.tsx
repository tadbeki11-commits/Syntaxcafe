"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, KeyRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCashierAuth } from "@/components/cashier/auth-context";
import { cashierServices } from "@/lib/cashier/api";

export default function CashierProfilePage() {
  const { user } = useCashierAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async () => {
    if (!user?.id) return;
    const name = fullName.trim();
    if (!name) {
      toast.error("Full name is required");
      return;
    }
    setSavingProfile(true);
    try {
      await cashierServices.account.updateProfile(user.id, { full_name: name });
      try {
        const raw = localStorage.getItem("cp_user");
        if (raw) {
          const u = JSON.parse(raw);
          localStorage.setItem("cp_user", JSON.stringify({ ...u, full_name: name }));
        }
      } catch {
        /* ignore cache write errors */
      }
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!user?.id) return;
    if (!currentPassword || !newPassword) {
      toast.error("Enter your current and new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await cashierServices.account.changePassword(user.id, currentPassword, newPassword);
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/cashier">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-lg font-extrabold text-foreground">My Profile</h1>
      </div>

      {/* Account */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Your sign-in details</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={user?.username || ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={savingProfile}
              placeholder="Your name"
            />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>Update the password you sign in with</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={savingPassword}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={savingPassword}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={savingPassword}
              autoComplete="new-password"
            />
          </div>
          <Button onClick={savePassword} disabled={savingPassword}>
            {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Update password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
