import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MenuItemDto {
  @ApiPropertyOptional()
  id?: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  main_category?: string;

  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  is_available?: boolean;

  @ApiPropertyOptional()
  image_url?: string;

  @ApiPropertyOptional()
  prep_time_minutes?: number;

  @ApiPropertyOptional()
  sku?: string;

  @ApiPropertyOptional()
  barcode?: string;

  @ApiPropertyOptional()
  categories?: any[];

  @ApiPropertyOptional({ type: [String] })
  predefined_notes?: string[];

  @ApiPropertyOptional()
  created_at?: string;

  @ApiPropertyOptional()
  updated_at?: string;
}

export class MenuItemRequestDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  main_category?: string;

  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  is_available?: boolean;

  @ApiPropertyOptional()
  image_url?: string;

  @ApiPropertyOptional()
  prep_time_minutes?: number;

  @ApiPropertyOptional()
  sku?: string;

  @ApiPropertyOptional()
  barcode?: string;

  @ApiPropertyOptional()
  categories?: any[];

  @ApiPropertyOptional({ type: [String] })
  predefined_notes?: string[];
}

export class MenuItemUpdateDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  main_category?: string;

  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  is_available?: boolean;

  @ApiPropertyOptional()
  image_url?: string;

  @ApiPropertyOptional()
  prep_time_minutes?: number;

  @ApiPropertyOptional()
  sku?: string;

  @ApiPropertyOptional()
  barcode?: string;

  @ApiPropertyOptional()
  categories?: any[];

  @ApiPropertyOptional({ type: [String] })
  predefined_notes?: string[];
}

export class MenuItemDataDto {
  @ApiProperty({ type: () => MenuItemDto })
  menuItem!: MenuItemDto;
}

export class MenuItemResponseDto {
  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty({ type: () => MenuItemDataDto })
  data!: MenuItemDataDto;
}

export class MenuItemsDataDto {
  @ApiProperty({ type: () => [MenuItemDto] })
  menuItems!: MenuItemDto[];

  @ApiProperty()
  count!: number;
}

export class MenuItemsResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty({ type: () => MenuItemsDataDto })
  data!: MenuItemsDataDto;
}

export class MainCategoryDto {
  @ApiPropertyOptional()
  id?: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  display_order?: number;

  @ApiPropertyOptional()
  is_active?: boolean;

  @ApiPropertyOptional()
  created_at?: string;

  @ApiPropertyOptional()
  updated_at?: string;
}

export class MainCategoryRequestDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  slug?: string;

  @ApiPropertyOptional()
  display_order?: number;

  @ApiPropertyOptional()
  is_active?: boolean;
}

export class MainCategoriesDataDto {
  @ApiProperty({ type: () => [MainCategoryDto] })
  mainCategories!: MainCategoryDto[];

  @ApiProperty()
  count!: number;
}

export class MainCategoriesResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty({ type: () => MainCategoriesDataDto })
  data!: MainCategoriesDataDto;
}
