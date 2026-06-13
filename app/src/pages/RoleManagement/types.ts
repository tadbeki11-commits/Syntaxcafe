export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
}

export const DEFAULT_ROLE_FORM: RoleFormData = {
  name: '',
  display_name: '',
  description: '',
  is_active: true,
};
