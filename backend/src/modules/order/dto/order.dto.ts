import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OrderItemDto {
  @ApiPropertyOptional()
  menu_item_id?: number;

  @ApiPropertyOptional()
  quantity?: number;

  @ApiPropertyOptional()
  unit_price?: number;

  @ApiPropertyOptional()
  subtotal?: number;

  @ApiPropertyOptional()
  item_type?: string;

  @ApiPropertyOptional()
  main_category?: string;
}

export class OrderRequestDto {
  @ApiPropertyOptional()
  employee_id?: number;

  @ApiPropertyOptional()
  customer_id?: string;

  @ApiPropertyOptional()
  table_number?: number;

  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional({ type: () => [OrderItemDto] })
  items?: OrderItemDto[];

  @ApiPropertyOptional()
  total_amount?: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  organization_id?: number;

  @ApiPropertyOptional()
  is_price_override?: boolean;
}

export class OrderStatusUpdateDto {
  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  updated_by?: number;

  @ApiPropertyOptional()
  completed_by?: number;
}

export class OrderItemsUpdateDto {
  @ApiProperty({ type: () => [OrderItemDto] })
  items!: OrderItemDto[];

  @ApiPropertyOptional()
  updated_by?: number;
}

export class OrderDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional()
  customer_id?: string;

  @ApiPropertyOptional()
  employee_id?: number;

  @ApiPropertyOptional()
  table_number?: number;

  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  total_amount?: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  employee_name?: string;

  @ApiPropertyOptional({ type: () => [OrderItemDto] })
  items?: OrderItemDto[];
}

export class OrderDataDto {
  @ApiProperty({ type: () => OrderDto })
  order!: OrderDto;
}

export class OrdersDataDto {
  @ApiProperty({ type: () => [OrderDto] })
  orders!: OrderDto[];

  @ApiProperty()
  count!: number;
}

export class OrderResponseDto {
  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty({ type: () => OrderDataDto })
  data!: OrderDataDto;
}

export class OrderItemCollectionDto {
  @ApiProperty({ type: () => [OrderDto] })
  orders!: OrderDto[];

  @ApiProperty()
  count!: number;
}

export class OrdersResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty({ type: () => OrderItemCollectionDto })
  data!: OrderItemCollectionDto;
}

export class OrderStatusHistoryItemDto {
  @ApiPropertyOptional()
  id?: number;

  @ApiPropertyOptional()
  order_id?: number;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  changed_by?: number;

  @ApiPropertyOptional()
  changed_at?: string;

  @ApiPropertyOptional()
  changed_by_name?: string;
}

export class OrderStatusHistoryDataDto {
  @ApiProperty({ type: () => [OrderStatusHistoryItemDto] })
  statusHistory!: OrderStatusHistoryItemDto[];
}

export class OrderStatusHistoryResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty({ type: () => OrderStatusHistoryDataDto })
  data!: OrderStatusHistoryDataDto;
}

export class BulkSyncOrderDto extends OrderRequestDto {
}

export class BulkSyncPaymentDto {
  @ApiProperty()
  amount!: number;

  @ApiProperty()
  payment_method!: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  processed_by?: number;

  @ApiPropertyOptional()
  paid_at?: string;
}

export class BulkSyncRequestDto {
  @ApiProperty({ type: () => [BulkSyncOrderDto] })
  orders!: BulkSyncOrderDto[];

  @ApiProperty({ type: () => [BulkSyncPaymentDto] })
  payments!: BulkSyncPaymentDto[];
}

export class BulkSyncResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  data!: any;
}
