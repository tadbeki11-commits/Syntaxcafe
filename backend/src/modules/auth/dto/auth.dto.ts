import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuthUserDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  role?: string;

  @ApiPropertyOptional()
  role_id?: string;

  @ApiPropertyOptional()
  full_name?: string;

  @ApiPropertyOptional()
  first_name?: string;

  @ApiPropertyOptional()
  last_name?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  created_at?: string;

  @ApiPropertyOptional()
  updated_at?: string;

  @ApiPropertyOptional()
  is_active?: boolean;
}

export class LoginRequestDto {
  @ApiProperty()
  username!: string;

  @ApiProperty()
  password!: string;
}

export class PinLoginRequestDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  pin!: string;
}

export class StaffLoginRequestDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  password!: string;
}

export class RegisterUserRequestDto {
  @ApiPropertyOptional()
  username?: string;

  @ApiProperty()
  password!: string;

  @ApiPropertyOptional({
    enum: [
      "admin",
      "fb_manager",
      "finance",
      "cashier",
      "kitchen_staff",
      "cafe_waiter",
      "barista",
      "host",
      "storekeeper",
      "accountant",
      "housekeeping",
    ],
  })
  role?: string;

  @ApiPropertyOptional()
  role_id?: string;

  @ApiPropertyOptional()
  full_name?: string;

  @ApiPropertyOptional()
  first_name?: string;

  @ApiPropertyOptional()
  last_name?: string;

  @ApiPropertyOptional()
  phone?: string;
}

export class UpdateProfileRequestDto {
  @ApiPropertyOptional()
  full_name?: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  first_name?: string;

  @ApiPropertyOptional()
  last_name?: string;

  @ApiPropertyOptional()
  phone?: string;
}

export class LoginTokenDto {
  @ApiProperty()
  access_token!: string;
}

export class AuthLoginResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: () => LoginTokenDto })
  token!: LoginTokenDto;

  @ApiProperty({ description: "Current server time in ISO8601 format" })
  server_time!: string;
}

export class AuthUserResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;

  @ApiPropertyOptional({ description: "Current server time in ISO8601 format" })
  server_time?: string;
}

export class AuthProfileResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;
}

export class LogoutResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  message!: string;
}
