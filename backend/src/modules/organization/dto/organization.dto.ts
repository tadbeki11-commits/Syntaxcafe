import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OrganizationRequestDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  contact_name?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  is_active?: boolean;
}

export class OrganizationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  contact_name?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  is_active!: boolean;
}
