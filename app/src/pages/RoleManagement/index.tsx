import React from 'react';
import { Plus, RefreshCw, Shield, UserCog } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RoleStats } from './components/RoleStats';
import { RolesTable } from './components/RolesTable';
import { RoleFormDialog } from './components/RoleFormDialog';
import { useRoleData } from './hooks/useRoleData';
import OfflineBanner from '@/components/OfflineBanner';
import { useSyncOnline } from '@/hooks/useSyncOnline';

export const RoleManagement: React.FC = () => {
  const {
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
  } = useRoleData();
  const online = useSyncOnline();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Role Management"
        description="Create and manage custom roles for assigning to users"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchRoles} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={openAdd} disabled={!online}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </div>
        }
      />

      <OfflineBanner online={online} />

      <RoleStats roles={roles} />

      <RolesTable
        loading={loading}
        roles={roles}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <RoleFormDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        selectedRole={selectedRole}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default RoleManagement;
