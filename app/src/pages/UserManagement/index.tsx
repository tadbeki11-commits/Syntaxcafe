import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import useUserData from './hooks/useUserData';
import UserStats from './components/UserStats';
import UserFilters from './components/UserFilters';
import UsersTable from './components/UsersTable';
import UserFormDialog from './components/UserFormDialog';
import OfflineBanner from '@/components/OfflineBanner';

export const UserManagement: React.FC = () => {
  const {
    loading,
    users,
    searchTerm,
    setSearchTerm,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    dialogOpen,
    setDialogOpen,
    selectedUser,
    formData,
    setFormData,
    authMode,
    setAuthMode,
    syncStatus,
    handleManualSync,
    filteredUsers,
    openAdd,
    openEdit,
    handleSubmit,
    toggleStatus,
    deleteUser,
    roles
  } = useUserData();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users and their permissions"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleManualSync} disabled={syncStatus.syncing || !syncStatus.online}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus.syncing ? 'animate-spin' : ''}`} />
              {syncStatus.syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button onClick={openAdd} disabled={!syncStatus.online}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        }
      />

      <OfflineBanner online={syncStatus.online} />

      <UserStats users={users} />

      <UserFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        count={filteredUsers.length}
      />

      <UsersTable
        loading={loading}
        filteredUsers={filteredUsers}
        toggleStatus={toggleStatus}
        openEdit={openEdit}
        deleteUser={deleteUser}
      />

      <UserFormDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        selectedUser={selectedUser}
        formData={formData}
        setFormData={setFormData}
        authMode={authMode}
        setAuthMode={setAuthMode}
        handleSubmit={handleSubmit}
        roles={roles}
      />
    </div>
  );
};

export default UserManagement;
