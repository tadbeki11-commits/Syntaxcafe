import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';

import { useProfileData } from './hooks/useProfileData';
import ProfileSidebar from './components/ProfileSidebar';
import ProfileForm from './components/ProfileForm';
import AccountDetailsCard from './components/AccountDetailsCard';
import QuickActionsCard from './components/QuickActionsCard';
import CancelPasswordCard from './components/CancelPasswordCard.tsx';
import ChangePasswordDialog from './components/ChangePasswordDialog';

export const Profile: React.FC = () => {
  const {
    online,
    user,
    getRoleDisplayName,
    isAdmin,
    isWaiter,
    isEditing,
    setIsEditing,
    isLoading,
    showChangePassword,
    setShowChangePassword,
    passwordForm,
    passwordErrors,
    cancelPasswordForm,
    cancelPasswordErrors,
    formData,
    errors,
    handleChange,
    handleSubmit,
    handleCancel,
    handleLogout,
    handlePasswordFieldChange,
    submitPasswordChange,
    handleClosePasswordDialog,
    handleCancelPasswordFieldChange,
    submitCancelPasswordChange,
    handleCloseCancelPasswordForm,
  } = useProfileData();

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account information and preferences"
        actions={
          isWaiter && (
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoading}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ProfileSidebar user={user} getRoleDisplayName={getRoleDisplayName} />
        </div>

        <div className="lg:col-span-2">
          <ProfileForm
            isOnline={online}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            isLoading={isLoading}
            formData={formData}
            errors={errors}
            getRoleDisplayName={getRoleDisplayName}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            handleCancel={handleCancel}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AccountDetailsCard user={user} />
        <QuickActionsCard isOnline={online} setShowChangePassword={setShowChangePassword} />
      </div>

      {isAdmin && (
        <CancelPasswordCard
          isLoading={isLoading}
          isOnline={online}
          formData={cancelPasswordForm}
          errors={cancelPasswordErrors}
          handleChange={handleCancelPasswordFieldChange}
          handleSubmit={submitCancelPasswordChange}
          handleReset={handleCloseCancelPasswordForm}
        />
      )}

      <ChangePasswordDialog
        showChangePassword={showChangePassword}
        setShowChangePassword={setShowChangePassword}
        isLoading={isLoading}
        isWaiter={isWaiter}
        passwordForm={passwordForm}
        passwordErrors={passwordErrors}
        handlePasswordFieldChange={handlePasswordFieldChange}
        submitPasswordChange={submitPasswordChange}
        handleClosePasswordDialog={handleClosePasswordDialog}
      />
    </div>
  );
};

export default Profile;
