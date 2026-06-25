import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { OrderService } from "./order.service";
import { ZReportService } from "./z-report.service";
import {
  OrderItemsUpdateDto,
  OrderRequestDto,
  OrderResponseDto,
  OrderStatusHistoryResponseDto,
  OrderStatusUpdateDto,
  OrdersResponseDto,
  BulkSyncRequestDto,
  BulkSyncResponseDto,
} from "./dto/order.dto";
import db from "../../db/drizzle";
import { syncEvents } from "../../db/tables/sync-events.table";
import { desc, gt } from "drizzle-orm";
import { RequirePermission } from "../../common/permissions/require-permission.decorator";

@ApiTags("orders")
@RequirePermission("orders")
@Controller("orders")
export class OrderController {
  constructor(
    private orderService: OrderService,
    private zReportService: ZReportService,
  ) {}

  @ApiOperation({ summary: "Create a new order" })
  @ApiBody({ type: OrderRequestDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @Post()
  async createOrder(@Body() body: OrderRequestDto) {
    const order = await this.orderService.create(body);
    return {
      status: "success",
      message: "Order created successfully",
    };
  }

  @ApiOperation({ summary: "Bulk sync orders and payments" })
  @ApiBody({ type: BulkSyncRequestDto })
  @ApiOkResponse({ type: BulkSyncResponseDto })
  @Post("sync")
  async bulkSync(@Body() body: BulkSyncRequestDto) {
    const data = await this.orderService.bulkSync(body);
    return {
      status: "success",
      message: "Bulk sync processed successfully",
      data,
    };
  }

  @ApiOperation({ summary: "List orders (paginated, date-windowed)" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "employee_id", required: false })
  @ApiQuery({ name: "table_number", required: false })
  @ApiQuery({ name: "date_from", required: false })
  @ApiQuery({ name: "date_to", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false, description: "1-based page number" })
  @ApiQuery({ name: "limit", required: false, description: "Page size (max 100)" })
  @ApiOkResponse({ type: OrdersResponseDto })
  @Get()
  async getAllOrders(@Query() query: any) {
    const filters: any = {};
    [
      "status",
      "type",
      "employee_id",
      "table_number",
      "paid",
      "date_from",
      "date_to",
      "search",
      "page",
      "limit",
      "sort_by",
      "sort_dir",
    ].forEach((k) => {
      if (query[k]) filters[k] = query[k];
    });
    const result = await this.orderService.findAllPaged(filters);
    return { status: "success", data: result };
  }

  @ApiOperation({ summary: "Stream new order events" })
  @Get("stream")
  async streamNewOrders(@Req() req: any, @Res() res: any) {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    let closed = false;
    let pollTimer: any = null;
    const heartbeat = setInterval(() => {
      if (closed) return;
      try {
        res.write(": ping\n\n");
      } catch {
        cleanup();
      }
    }, 15000);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      if (pollTimer) clearTimeout(pollTimer);
      try {
        res.end();
      } catch {
        // ignore
      }
    };

    req.on("close", cleanup);
    req.on("aborted", cleanup);

    let cursor = 0;
    try {
      const [latest] = await db
        .select({ id: syncEvents.id })
        .from(syncEvents)
        .orderBy(desc(syncEvents.id))
        .limit(1);
      cursor = latest?.id ?? 0;
    } catch {
      cursor = 0;
    }

    const poll = async () => {
      if (closed) return;

      try {
        const rows = await db
          .select()
          .from(syncEvents)
          .where(gt(syncEvents.id, cursor))
          .orderBy(desc(syncEvents.id))
          .limit(1);

        if (rows.length > 0) {
          const eventRow = rows[0];
          cursor = eventRow.id;

          if (eventRow.event_type === "ORDER_CREATED") {
            res.write("event: new_order\n");
            res.write(
              `data: ${JSON.stringify({
                id: eventRow.id,
                entityType: eventRow.entity_type,
                entityId: eventRow.entity_id,
                payload: eventRow.payload,
                createdAt: eventRow.created_at,
              })}\n\n`,
            );
          }
        }
      } catch {
        // ignore transient polling errors; the next tick may recover
      }

      if (!closed) {
        pollTimer = setTimeout(poll, 3000);
      }
    };

    pollTimer = setTimeout(poll, 0);
  }

  @ApiOperation({ summary: "Update the status of an order" })
  @ApiParam({ name: "id", required: true })
  @ApiBody({ type: OrderStatusUpdateDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @Put(":id/status")
  async updateOrderStatus(
    @Param("id") id: string,
    @Body() body: OrderStatusUpdateDto,
  ) {
    const updated = await this.orderService.updateStatus(
      id,
      body.status,
      body.updated_by,
    );
    return {
      status: "success",
      message: "Order status updated successfully",
      data: { order: updated },
    };
  }

  @ApiOperation({ summary: "Get the status history for an order" })
  @ApiParam({ name: "id", required: true })
  @ApiOkResponse({ type: OrderStatusHistoryResponseDto })
  @Get(":id/status-history")
  async getOrderStatusHistory(@Param("id") id: string) {
    const history = await this.orderService.getStatusHistory(id);
    return { status: "success", data: { statusHistory: history } };
  }

  @ApiOperation({ summary: "Get pending orders" })
  @ApiQuery({ name: "type", required: false })
  @ApiOkResponse({ type: OrdersResponseDto })
  @Get("pending")
  async getPendingOrders(@Query("type") type: string) {
    const orders = await this.orderService.getPendingOrders(type);
    return { status: "success", data: { orders, count: orders.length } };
  }

  @ApiOperation({ summary: "Get ready orders" })
  @ApiQuery({ name: "type", required: false })
  @ApiOkResponse({ type: OrdersResponseDto })
  @Get("ready")
  async getReadyOrders(@Query("type") type: string) {
    const orders = await this.orderService.getReadyOrders(type);
    return { status: "success", data: { orders, count: orders.length } };
  }

  @ApiOperation({ summary: "Create a cafe order" })
  @ApiBody({ type: OrderRequestDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @Post("cafe")
  async createCafeOrder(@Body() body: OrderRequestDto) {
    const order = await this.orderService.createCafeOrder(body);
    return {
      status: "success",
      message: "Cafe order created successfully",
      data: { order },
    };
  }

  @ApiOperation({ summary: "Get kitchen orders" })
  @ApiOkResponse({ type: OrdersResponseDto })
  @Get("kitchen")
  async getKitchenOrders() {
    const orders = await this.orderService.getKitchenOrders();
    return { status: "success", data: { orders, count: orders.length } };
  }

  @ApiOperation({ summary: "Mark an order as ready" })
  @ApiParam({ name: "id", required: true })
  @ApiBody({ type: OrderStatusUpdateDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @Post(":id/mark-ready")
  async markOrderReady(
    @Param("id") id: string,
    @Body() body: OrderStatusUpdateDto,
  ) {
    const updated = await this.orderService.markOrderReady(
      id,
      body.updated_by,
    );
    return {
      status: "success",
      message: "Order marked as ready",
      data: { order: updated },
    };
  }

  @ApiOperation({ summary: "Mark an order as completed" })
  @ApiParam({ name: "id", required: true })
  @ApiBody({ type: OrderStatusUpdateDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @Post(":id/complete")
  async completeOrder(
    @Param("id") id: string,
    @Body() body: OrderStatusUpdateDto,
  ) {
    const updated = await this.orderService.completeOrder(
      id,
      body.completed_by,
    );
    return {
      status: "success",
      message: "Order completed",
      data: { order: updated },
    };
  }

  @ApiOperation({ summary: "List orders ready for payment" })
  @ApiQuery({ name: "employee_id", required: false })
  @ApiOkResponse({ type: OrdersResponseDto })
  @Get("for-payment")
  async getOrdersForPayment(@Query() query: any) {
    const filters: any = {};
    if (query.employee_id) filters.employee_id = query.employee_id;
    const orders = await this.orderService.getOrdersForPayment(filters);
    return { status: "success", data: { orders, count: orders.length } };
  }

  @ApiOperation({
    summary:
      "Active orders awaiting payment, with per-department dues for the cashier portal",
  })
  @ApiQuery({
    name: "departments",
    required: false,
    description: "Comma-separated departments to scope the queue to",
  })
  @ApiOkResponse({ type: OrdersResponseDto })
  @Get("cashier-queue")
  async getCashierQueue(@Query() query: any) {
    const departments = String(query.departments || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const orders = await this.orderService.getCashierQueue({
      departments,
      employee_id: query.employee_id || undefined,
    });
    return { status: "success", data: { orders, count: orders.length } };
  }

  @ApiOperation({ summary: "Update the items for an order" })
  @ApiParam({ name: "id", required: true })
  @ApiBody({ type: OrderItemsUpdateDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @Put(":id/items")
  async updateOrderItems(
    @Param("id") id: string,
    @Body() body: OrderItemsUpdateDto,
  ) {
    const updated = await this.orderService.updateOrderItems(
      id,
      body.items,
      body.updated_by,
    );
    return {
      status: "success",
      message: "Order items updated successfully",
      data: { order: updated },
    };
  }

  @ApiOperation({ summary: "Add items to an order" })
  @ApiParam({ name: "id", required: true })
  @ApiBody({ type: OrderItemsUpdateDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @Post(":id/items")
  async addOrderItems(
    @Param("id") id: string,
    @Body() body: OrderItemsUpdateDto,
  ) {
    const updated = await this.orderService.addOrderItems(
      id,
      body.items,
      body.updated_by,
    );
    return {
      status: "success",
      message: "Items added to order successfully",
      data: { order: updated },
    };
  }

  @ApiOperation({ summary: "Get orders by type" })
  @ApiParam({ name: "orderType", required: true })
  @ApiOkResponse({ type: OrdersResponseDto })
  @Get("type/:orderType")
  async getOrdersByType(@Param("orderType") orderType: string) {
    const orders = await this.orderService.getOrdersByType(orderType);
    return { status: "success", data: { orders, count: orders.length } };
  }

  @ApiOperation({ summary: "Mark food items on an order as ready" })
  @ApiParam({ name: "id", required: true })
  @ApiOkResponse({ type: OrderResponseDto })
  @Post(":id/mark-food-ready")
  async markFoodReady(@Param("id") id: string) {
    const order = await this.orderService.markFoodReady(id);
    return {
      status: "success",
      message: "Food items marked as ready",
      data: { order },
    };
  }

  @ApiOperation({ summary: "Get occupied tables" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        status: { type: "string" },
        data: {
          type: "object",
          properties: {
            occupiedTables: { type: "array", items: { type: "object" } },
            count: { type: "number" },
          },
        },
      },
    },
  })
  @Get("occupied-tables")
  async getOccupiedTables() {
    const tables = await this.orderService.getOccupiedTables();
    return {
      status: "success",
      data: { occupiedTables: tables, count: tables.length },
    };
  }

  @ApiOperation({ summary: "Generate Z-report for a date range" })
  @ApiQuery({ name: "start_date", required: false, description: "ISO date string (YYYY-MM-DD)" })
  @ApiQuery({ name: "end_date", required: false, description: "ISO date string (YYYY-MM-DD)" })
  @Get("z-report")
  async getZReport(@Query() query: any) {

    const { start_date, end_date } = query;
    
    let startDate: Date;
    let endDate: Date;

    if (start_date) {
      const [startYear, startMonth, startDay] = start_date.split('-').map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    } else {
     
      const now = new Date();
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
    }

      if (end_date) {
      const [endYear, endMonth, endDay] = end_date.split('-').map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
    } else {
      endDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        23,
        59,
        59,
        999
      );
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { status: "error", message: "Invalid date format" };
    }

    const zReport = await this.zReportService.generateZReport(startDate, endDate);
    return {
      status: "success",
      data: { zReport },
    };
  }

  @ApiOperation({ summary: "Get an order by ID" })
  @ApiParam({ name: "id", required: true })
  @ApiOkResponse({ type: OrderResponseDto })
  @Get(":id")
  async getOrder(@Param("id") id: string) {
    const order = await this.orderService.findById(id);
    if (!order) return { status: "error", message: "Order not found" };
    return { status: "success", data: { order } };
  }
}
