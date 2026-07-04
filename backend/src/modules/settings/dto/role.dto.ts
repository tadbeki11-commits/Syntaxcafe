/**
 * Role-related DTOs
 */
export class RoleRequestDto {
  name!: string;
  display_name!: string;
  description?: string;
  is_active?: boolean;
}

export class RoleResponseDto {
  id!: number;
  name!: string;
  display_name!: string;
  description?: string;
  is_active!: boolean;
  created_at!: string;
  updated_at!: string;
}

export class RolesResponseDto {
  status!: string;
  data!: { roles: RoleResponseDto[]; count: number };
}

/**
 * Current user settings DTOs
 */
export class CancelPasswordRequestDto {
  cancel_password!: string;
}

export class PrinterPasswordRequestDto {
  printer_password!: string;
}

export class PrintCopiesRequestDto {
  print_copies!: number;
}

export class UserSettingsResponseDto {
  cancel_password?: string;
  print_copies?: number;
}
