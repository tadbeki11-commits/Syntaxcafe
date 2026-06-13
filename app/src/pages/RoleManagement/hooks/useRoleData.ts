import React, { useState, useEffect, useCallback } from "react";
import api from "@/application";
import { Role, RoleFormData, DEFAULT_ROLE_FORM } from "../types";
import toast from "react-hot-toast";

/** Convert a display-name to a lowercase snake_case key */
const nameToKey = (display: string) =>
  String(display)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

export const useRoleData = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    ...DEFAULT_ROLE_FORM,
  });
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.settings.getRoles();
      if (response) {
        const list =
          (response as any)?.data?.data?.roles ??
          (response as any)?.data?.roles ??
          [];
        setRoles(Array.isArray(list) ? list : []);
      }
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openAdd = () => {
    setSelectedRole(null);
    setFormData({ ...DEFAULT_ROLE_FORM });
    setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || "",
      is_active: role.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name.trim() || !formData.name.trim()) {
      toast.error("Display name and system key are required");
      return;
    }
    try {
      setSaving(true);
      if (selectedRole) {
        await api.settings.updateRole(selectedRole.id, formData);
        toast.success("Role updated");
      } else {
        const key = nameToKey(formData.display_name);
        const payload = { ...formData, name: key };
        await api.settings.createRole(payload);
        toast.success("Role created");
      }
      setDialogOpen(false);
      fetchRoles();
    } catch {
      toast.error("Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (
      !window.confirm(
        `Disable role "${role.display_name}"? Users with this role will keep it but it cannot be reassigned.`,
      )
    )
      return;
    try {
      await api.settings.deleteRole(role.id);
      toast.success("Role disabled");
      fetchRoles();
    } catch {
      toast.error("Failed to disable role");
    }
  };

  return {
    loading,
    roles,
    dialogOpen,
    setDialogOpen,
    selectedRole,
    formData,
    setFormData,
    saving,
    openAdd,
    openEdit,
    handleSubmit,
    handleDelete,
    fetchRoles,
  };
};

export default useRoleData;
