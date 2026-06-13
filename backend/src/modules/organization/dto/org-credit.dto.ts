import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OrgCreditServiceItemDto {
  @ApiProperty({ description: "Description of the service used" })
  description!: string;

  @ApiProperty({ description: "Cost of this service" })
  cost!: number;
}

export class AddOrgPaymentDto {
  @ApiProperty({ description: "Amount to credit" })
  amount!: number;

  @ApiPropertyOptional({ description: "ISO date string for payment date" })
  payment_date?: string;

  @ApiPropertyOptional({ description: "Optional notes about this payment" })
  notes?: string;
}

export class AddOrgTransactionDto {
  @ApiPropertyOptional({
    description: "Link to a specific payment top-up (optional)",
  })
  payment_id?: string;

  @ApiPropertyOptional({ description: "ISO date string for transaction date" })
  transaction_date?: string;

  @ApiPropertyOptional({ description: "Optional notes about this transaction" })
  notes?: string;

  @ApiProperty({
    type: [OrgCreditServiceItemDto],
    description: "Services consumed in this transaction",
  })
  services!: OrgCreditServiceItemDto[];
}
