"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AtSignIcon,
  KeyRoundIcon,
  PencilIcon,
  SaveIcon,
  ShieldIcon,
  UserIcon,
  XIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { getUser, roleLabel, setUser, type SessionUser } from "@/lib/auth";
import { Account } from "@/lib/resources";

export default function ProfilePage() {
  const [user, setUserState] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Account info edit state
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  // Change password state
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const u = getUser();
    setUserState(u);
    setFullName(u?.full_name ?? "");
    setUsername(u?.username ?? "");
    setLoading(false);
  }, []);

  function cancelEdit() {
    setFullName(user?.full_name ?? "");
    setUsername(user?.username ?? "");
    setEditing(false);
  }

  async function saveProfile() {
    if (!user) return;
    if (!fullName.trim()) return toast.error("Full name is required");
    if (username.trim().length < 3)
      return toast.error("Username must be at least 3 characters");

    setSavingProfile(true);
    try {
      const updated = await Account.updateProfile(user.id, {
        full_name: fullName.trim(),
        username: username.trim(),
      });
      const next: SessionUser = {
        ...user,
        full_name: updated?.full_name ?? fullName.trim(),
        username: updated?.username ?? username.trim(),
      };
      setUser(next);
      setUserState(next);
      setEditing(false);
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (!user) return;
    if (!currentPassword) return toast.error("Current password is required");
    if (newPassword.length < 6)
      return toast.error("New password must be at least 6 characters");
    if (newPassword !== confirmPassword)
      return toast.error("Password confirmation does not match");

    setSavingPassword(true);
    try {
      await Account.changePassword(user.id, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingPassword(false);
    }
  }

  const initials = (user?.full_name || user?.username || "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account information and password."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            {loading ? (
              <>
                <Skeleton className="size-24 rounded-full" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </>
            ) : (
              <>
                <Avatar className="size-24">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">
                    {user?.full_name || user?.username}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    @{user?.username}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1.5">
                  <ShieldIcon className="size-3.5" />
                  {roleLabel(user?.role)}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* Account information */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Account information</CardTitle>
              <CardDescription>
                Your name and username on the platform.
              </CardDescription>
            </div>
            {!editing ? (
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setEditing(true)}>
                <PencilIcon className="size-4" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={savingProfile}
                  onClick={cancelEdit}>
                  <XIcon className="size-4" />
                  Cancel
                </Button>
                <Button size="sm" disabled={savingProfile} onClick={saveProfile}>
                  <SaveIcon className="size-4" />
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <div className="relative">
                <UserIcon className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                <Input
                  id="full_name"
                  className="pl-9"
                  value={fullName}
                  disabled={!editing || savingProfile}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSignIcon className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                <Input
                  id="username"
                  className="pl-9"
                  value={username}
                  disabled={!editing || savingProfile}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="relative">
                <ShieldIcon className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                <Input
                  className="bg-muted pl-9"
                  value={roleLabel(user?.role)}
                  disabled
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Roles are managed by a platform administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change password */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-5" />
            Change password
          </CardTitle>
          <CardDescription>
            Use a strong password of at least 6 characters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current password</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              disabled={savingPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                disabled={savingPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                disabled={savingPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={savingPassword} onClick={savePassword}>
              <KeyRoundIcon className="size-4" />
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
