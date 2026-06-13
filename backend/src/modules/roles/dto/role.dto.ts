import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RoleRequestDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  display_name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ default: true })
  is_active?: boolean;
}
