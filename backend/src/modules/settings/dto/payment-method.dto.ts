/**
 * Payment Method settings DTOs
 */
export class PaymentMethodRequestDto {
  name!: string;
  display_name!: string;
  icon?: string;
  description?: string;
  is_active?: boolean;
}

export class PaymentMethodResponseDto {
  id!: number;
  name!: string;
  display_name!: string;
  icon?: string;
  description?: string;
  is_active!: boolean;
  created_at!: string;
  updated_at!: string;
}

export class PaymentMethodsResponseDto {
  status!: string;
  data!: { payment_methods: PaymentMethodResponseDto[]; count: number };
}
