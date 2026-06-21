import { Controller, Post, Body, Get, Param, Put, Query } from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { PaymentService } from "./payment.service";
import {
  PaymentQrResponseDto,
  PaymentRequestDto,
  PaymentResponseDto,
  PaymentStatusUpdateDto,
  PaymentsResponseDto,
  QRDataRequestDto,
} from "./dto/payment.dto";

@ApiTags("payments")
@Controller("payments")
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @ApiOperation({ summary: "Create a payment" })
  @ApiBody({ type: PaymentRequestDto })
  @ApiOkResponse({ type: PaymentResponseDto })
  @Post()
  async createPayment(@Body() body: PaymentRequestDto) {
    const payment = await this.paymentService.create(body);
    return {
      status: "success",
      message: "Payment created successfully",
      data: { payment },
    };
  }

  @ApiOperation({ summary: "List pending payments" })
  @ApiOkResponse({ type: PaymentsResponseDto })
  @Get("pending")
  async getPendingPayments() {
    const payments = await this.paymentService.getPendingPayments();
    return { status: "success", data: { payments, count: payments.length } };
  }

  @ApiOperation({ summary: "Get payment history (paginated, date-windowed)" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "payment_method", required: false })
  @ApiQuery({ name: "processed_by", required: false })
  @ApiQuery({ name: "date_from", required: false })
  @ApiQuery({ name: "date_to", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false, description: "1-based page number" })
  @ApiQuery({ name: "limit", required: false, description: "Page size (max 100)" })
  @ApiOkResponse({ type: PaymentsResponseDto })
  @Get("history")
  async getPaymentHistory(@Query() query: any) {
    const filters: any = {};
    [
      "status",
      "payment_method",
      "processed_by",
      "date_from",
      "date_to",
      "search",
      "page",
      "limit",
    ].forEach((k) => {
      if (query[k]) filters[k] = query[k];
    });
    const result = await this.paymentService.getPaymentHistory(filters);
    return { status: "success", data: result };
  }

  @ApiOperation({ summary: "Create a payment and generate a QR code" })
  @ApiBody({ type: PaymentRequestDto })
  @ApiOkResponse({ type: PaymentResponseDto })
  @Post("with-qr")
  async createPaymentWithQR(@Body() body: PaymentRequestDto) {
    const p = await this.paymentService.createWithQR(body);
    return {
      status: "success",
      message: "Payment created with QR code successfully",
      data: { payment: p, qr_code: p.qr_code },
    };
  }

  @ApiOperation({ summary: "Resolve a payment by QR payload" })
  @ApiBody({ type: QRDataRequestDto })
  @ApiOkResponse({ type: PaymentQrResponseDto })
  @Post("by-qr")
  async getPaymentByQR(@Body() body: QRDataRequestDto) {
    if (!body.qr_data)
      return { status: "error", message: "QR data is required" };
    let parsed;
    try {
      parsed = JSON.parse(body.qr_data);
    } catch (e) {
      return { status: "error", message: "Invalid QR data format" };
    }
    const payment = await this.paymentService.getByQR(parsed);
    if (!payment) return { status: "error", message: "Payment not found" };
    return { status: "success", data: { payment, qr_data: parsed } };
  }

  @ApiOperation({ summary: "Get all payments for an order" })
  @ApiParam({ name: "orderId", required: true })
  @ApiOkResponse({ type: PaymentsResponseDto })
  @Get("order/:orderId")
  async getOrderPayments(@Param("orderId") orderId: string) {
    const payments = await this.paymentService.findByOrderId(orderId);
    return { status: "success", data: { payments, count: payments.length } };
  }

  @ApiOperation({ summary: "Get a payment by ID" })
  @ApiParam({ name: "id", required: true })
  @ApiOkResponse({ type: PaymentResponseDto })
  @Get(":id")
  async getPayment(@Param("id") id: string) {
    const payment = await this.paymentService.findById(id);
    if (!payment) return { status: "error", message: "Payment not found" };
    return { status: "success", data: { payment } };
  }

  @ApiOperation({ summary: "Generate a QR code for a payment" })
  @ApiParam({ name: "id", required: true })
  @ApiOkResponse({ type: PaymentResponseDto })
  @Post(":id/generate-qr")
  async generateQRCode(@Param("id") id: string) {
    const payment = await this.paymentService.generateQRCode(id);
    return {
      status: "success",
      message: "QR code generated successfully",
      data: { payment, qr_code: payment.qr_code },
    };
  }

  @ApiOperation({ summary: "Update payment status" })
  @ApiParam({ name: "id", required: true })
  @ApiBody({ type: PaymentStatusUpdateDto })
  @ApiOkResponse({ type: PaymentResponseDto })
  @Put(":id/status")
  async updatePaymentStatus(
    @Param("id") id: string,
    @Body() body: PaymentStatusUpdateDto,
  ) {
    const updated = await this.paymentService.updateStatus(
      id,
      body.status,
      body.processed_by,
    );
    return {
      status: "success",
      message: "Payment status updated successfully",
      data: { payment: updated },
    };
  }

  @ApiOperation({ summary: "Confirm a payment" })
  @ApiParam({ name: "id", required: true })
  @ApiBody({ type: PaymentStatusUpdateDto })
  @ApiOkResponse({ type: PaymentResponseDto })
  @Post(":id/confirm")
  async confirmPayment(
    @Param("id") id: string,
    @Body() body: PaymentStatusUpdateDto,
  ) {
    const confirmed = await this.paymentService.confirmPayment(
      id,
      body.processed_by,
    );
    // Try to build receipt elsewhere; return payment for now
    return {
      status: "success",
      message: "Payment confirmed successfully",
      data: { payment: confirmed },
    };
  }
}
