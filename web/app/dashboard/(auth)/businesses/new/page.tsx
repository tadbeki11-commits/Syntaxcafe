"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input {...props} />
    </div>
  );
}

export default function NewBusinessPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    plan: "standard",
    max_branches: "",
    owner_name: "",
    username: "",
    password: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await apiFetch<{ id: string }>("/platform/businesses", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          plan: form.plan,
          max_branches: form.max_branches ? Number(form.max_branches) : null,
          owner: {
            name: form.owner_name || form.username,
            username: form.username,
            password: form.password,
          },
        }),
      });
      toast.success("Business created");
      router.push(`/dashboard/businesses/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create business");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/businesses">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">New Business</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business</CardTitle>
            <CardDescription>The owner company and its plan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Business name"
                value={form.name}
                onChange={set("name")}
                placeholder="Blue Bottle Cafe"
                required
              />
            </div>
            <Field
              label="Plan"
              value={form.plan}
              onChange={set("plan")}
              placeholder="standard"
            />
            <Field
              label="Max branches (blank = unlimited)"
              type="number"
              min={1}
              value={form.max_branches}
              onChange={set("max_branches")}
              placeholder="3"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Owner account</CardTitle>
            <CardDescription>
              The first user who can sign in and manage this business.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Full name"
                value={form.owner_name}
                onChange={set("owner_name")}
                placeholder="Sara Owner"
              />
            </div>
            <Field
              label="Username"
              value={form.username}
              onChange={set("username")}
              placeholder="sara"
              required
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••"
              required
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/businesses">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create business"}
          </Button>
        </div>
      </form>
    </div>
  );
}
