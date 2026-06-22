import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PaymentRequestDto {
  @ApiPropertyOptional()
  order_id?: number;

  @ApiPropertyOptional()
  amount?: number;

  @ApiPropertyOptional()
  payment_method?: string;

  @ApiPropertyOptional()
  processed_by?: number;

  @ApiPropertyOptional()
  description?: string;
}

export class DepartmentSettleRequestDto {
  @ApiProperty()
  order_id!: string;

  @ApiProperty({ description: "Department (order item main_category) to settle" })
  department!: string;

  @ApiPropertyOptional()
  payment_method?: string;

  @ApiPropertyOptional()
  processed_by?: string;
}

export class PaymentStatusUpdateDto {
  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  processed_by?: number;
}

export class PaymentHistoryFiltersDto {
  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  payment_method?: string;

  @ApiPropertyOptional()
  processed_by?: number;

  @ApiPropertyOptional()
  date_from?: string;

  @ApiPropertyOptional()
  date_to?: string;
}

export class QRDataRequestDto {
  @ApiProperty()
  qr_data!: string;
}

export class PaymentDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional()
  order_id?: number;

  @ApiPropertyOptional()
  amount?: number;

  @ApiPropertyOptional()
  amount_cents?: number;

  @ApiPropertyOptional()
  payment_method?: string;

  @ApiPropertyOptional()
  method?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  processed_by?: number;

  @ApiPropertyOptional()
  processed_by_name?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  qr_code?: string;

  @ApiPropertyOptional()
  paid_at?: string;

  @ApiPropertyOptional()
  customer_id?: string;

  @ApiPropertyOptional()
  order_type?: string;

  @ApiPropertyOptional()
  table_number?: number;
}

export class PaymentDataDto {
  @ApiProperty({ type: () => PaymentDto })
  payment!: PaymentDto;
}

export class PaymentsDataDto {
  @ApiProperty({ type: () => [PaymentDto] })
  payments!: PaymentDto[];

  @ApiProperty()
  count!: number;
}

export class PaymentResponseDto {
  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty({ type: () => PaymentDataDto })
  data!: PaymentDataDto;

  @ApiPropertyOptional()
  qr_code?: string;
}

export class PaymentsCollectionDto {
  @ApiProperty({ type: () => [PaymentDto] })
  payments!: PaymentDto[];

  @ApiProperty()
  count!: number;
}

export class PaymentsResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty({ type: () => PaymentsCollectionDto })
  data!: PaymentsCollectionDto;
}

export class PaymentQrDataDto {
  @ApiProperty({ type: () => PaymentDto })
  payment!: PaymentDto;

  @ApiProperty()
  qr_data!: string;
}

export class PaymentQrResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty({ type: () => PaymentQrDataDto })
  data!: PaymentQrDataDto;
}
