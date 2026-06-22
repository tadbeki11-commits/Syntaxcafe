"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SaveIcon, ShieldCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Permissions } from "@/lib/resources";
import {
  ACTIONS,
  CONFIGURABLE_ROLES,
  RESOURCES,
  type Action,
  type PermissionMatrix,
} from "@/lib/permissions";

const ACTION_LABELS: Record<Action, string> = {
  read: "Read",
  write: "Create",
  update: "Update",
  delete: "Delete",
};

function emptyAllowed(): PermissionMatrix {
  const m: PermissionMatrix = {};
  for (const r of RESOURCES) {
    m[r.id] = { read: true, write: true, update: true, delete: true };
  }
  return m;
}

// Owner-facing editor: pick a role, toggle read/create/update/delete per area,
// then save. New/unconfigured roles default to everything allowed; the owner
// restricts from here. super_admin / owner / business_admin are always full
// access and aren't listed.
export default function RolesPermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string>(CONFIGURABLE_ROLES[0].value);
  const [byRole, setByRole] = useState<Record<string, PermissionMatrix>>({});

  useEffect(() => {
    (async () => {
      try {
        const rows: { role: string; permissions: PermissionMatrix }[] =
          await Permissions.list();
        const map: Record<string, PermissionMatrix> = {};
        for (const r of rows) map[r.role] = r.permissions;
        setByRole(map);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load permissions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const matrix = byRole[role] ?? emptyAllowed();

  const roleLabel = useMemo(
    () => CONFIGURABLE_ROLES.find((r) => r.value === role)?.label ?? role,
    [role],
  );

  const setCell = (resource: string, action: Action, value: boolean) => {
    setByRole((prev) => {
      const current = prev[role] ?? emptyAllowed();
      return {
        ...prev,
        [role]: {
          ...current,
          [resource]: { ...current[resource], [action]: value },
        },
      };
    });
  };

  const setAll = (value: boolean) => {
    setByRole((prev) => {
      const next: PermissionMatrix = {};
      for (const r of RESOURCES) {
        next[r.id] = { read: value, write: value, update: value, delete: value };
      }
      return { ...prev, [role]: next };
    });
  };

  const setColumn = (action: Action, value: boolean) => {
    setByRole((prev) => {
      const current = prev[role] ?? emptyAllowed();
      const next: PermissionMatrix = {};
      for (const r of RESOURCES) {
        next[r.id] = { ...current[r.id], [action]: value };
      }
      return { ...prev, [role]: next };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await Permissions.save(role, matrix);
      toast.success(`Saved permissions for ${roleLabel}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Choose what each role can see and do. Owners and platform admins always have full access."
        action={
          <Button onClick={save} disabled={saving || loading} size="sm">
            <SaveIcon className="size-4" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      {/* Role picker */}
      <div className="flex flex-wrap gap-2">
        {CONFIGURABLE_ROLES.map((r) => (
          <Button
            key={r.value}
            size="sm"
            variant={role === r.value ? "default" : "outline"}
            onClick={() => setRole(r.value)}>
            {r.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4" /> {roleLabel} permissions
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAll(true)} disabled={loading}>
              Allow all
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAll(false)} disabled={loading}>
              Deny all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Area</TableHead>
                {ACTIONS.map((a) => (
                  <TableHead key={a} className="text-center">
                    <button
                      type="button"
                      className="hover:text-foreground text-muted-foreground text-xs font-medium uppercase tracking-wide"
                      onClick={() => setColumn(a, true)}
                      title={`Allow ${ACTION_LABELS[a]} for all areas`}>
                      {ACTION_LABELS[a]}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                RESOURCES.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    {ACTIONS.map((a) => (
                      <TableCell key={a} className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={matrix[r.id]?.[a] ?? true}
                            onCheckedChange={(v) => setCell(r.id, a, v)}
                          />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Changes apply the next time the user signs in or reloads. The desktop POS
        app is not affected by these settings.
      </p>
    </div>
  );
}
