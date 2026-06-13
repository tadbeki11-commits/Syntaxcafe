import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, Mail, Shield, Edit3, X, Save, WifiOff } from 'lucide-react';
import { ProfileFormData } from '../types';

interface ProfileFormProps {
  isOnline: boolean;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  isLoading: boolean;
  formData: ProfileFormData;
  errors: any;
  getRoleDisplayName: () => string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleCancel: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  isOnline,
  isEditing,
  setIsEditing,
  isLoading,
  formData,
  errors,
  getRoleDisplayName,
  handleChange,
  handleSubmit,
  handleCancel
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Account Information</CardTitle>
          <CardDescription>Verify or edit your profile fields</CardDescription>
        </div>
        {!isEditing ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditing(true)}
            disabled={!isOnline}
          >
            <Edit3 className="w-3.5 h-3.5 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleCancel} 
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isLoading}>
              <Save className="w-3.5 h-3.5 mr-2" />
              Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        {!isOnline && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3 text-xs font-semibold">
            <WifiOff className="w-4.5 h-4.5 shrink-0" />
            <span>Profile updates are disabled because you are currently offline. Please reconnect to change your profile settings.</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={!isEditing || isLoading}
                className={`pl-9 ${errors.full_name ? 'border-destructive' : ''}`}
                placeholder="Enter your full name"
              />
            </div>
            {errors.full_name && (
              <p className="text-xs text-destructive font-semibold">{errors.full_name}</p>
            )}
          </div>



          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">@</span>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={!isEditing || isLoading}
                className={`pl-8 ${errors.username ? 'border-destructive' : ''}`}
                placeholder="Enter your username"
              />
            </div>
            {errors.username && (
              <p className="text-xs text-destructive font-semibold">{errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={getRoleDisplayName()}
                disabled
                className="pl-9 bg-muted text-muted-foreground font-semibold cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">
              Role cannot be changed. Contact an administrator for role changes.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileForm;
