"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDownIcon, StoreIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { apiFetch, getBranchId, setBranchId } from "@/lib/api";
import { getUser } from "@/lib/auth";

type Branch = { id: string; name: string };

export function BranchSwitcher() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [role, setRole] = useState<string | undefined>();

  useEffect(() => {
    const user = getUser();
    setRole(user?.role);
    // Only owners switch branches. Super admins use the platform nav, and an
    // F&B manager is pinned to one branch by their JWT (the backend ignores
    // x-branch-id for branch scope), so neither needs a switcher.
    if (!user || user.role === "super_admin" || user.role === "fb_manager")
      return;

    apiFetch<Branch[]>("/branches")
      .then((list) => {
        setBranches(list);
        const selected = getBranchId();
        if (selected && list.some((b) => b.id === selected)) {
          setCurrent(selected);
        } else if (list[0]) {
          // Auto-select the first branch so pages always have a scope.
          setBranchId(list[0].id);
          setCurrent(list[0].id);
          window.location.reload();
        }
      })
      .catch(() => {});
  }, []);

  if (role === "super_admin" || branches.length === 0) return null;

  const currentBranch = branches.find((b) => b.id === current);

  function pick(id: string) {
    if (id === current) return;
    setBranchId(id);
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <StoreIcon className="size-4" />
          <span className="max-w-40 truncate">
            {currentBranch?.name ?? "Select branch"}
          </span>
          <ChevronsUpDownIcon className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuLabel>Switch branch</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => pick(b.id)}>
            <StoreIcon className="size-4" />
            {b.name}
            {b.id === current && (
              <span className="text-muted-foreground ml-auto text-xs">current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
