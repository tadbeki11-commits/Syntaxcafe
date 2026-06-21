import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InventoryService } from "./inventory.service";

@ApiTags("inventory")
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 50;
    const result = await this.inventoryService.findAll(pageNum, limitNum, search);
    return { status: "success", data: result };
  }

  @Get("transfers")
  async getTransfers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 10;
    const result = await this.inventoryService.findTransfers(pageNum, limitNum);
    return { status: "success", data: result };
  }

  @Post()
  async create(@Body() body: any) {
    const item = await this.inventoryService.create(body);
    return {
      status: "success",
      message: "Inventory item created",
      data: { item },
    };
  }

  @ApiOperation({ summary: "Bulk sync inventory items" })
  @Post("sync")
  async bulkSync(@Body() body: any) {
    const data = await this.inventoryService.syncBulk(
      body.inventoryItems || body.items || [],
    );
    return {
      status: "success",
      message: "Inventory items bulk sync successful",
      data,
    };
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    const item = await this.inventoryService.findOne(id);
    return { status: "success", data: { item } };
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    const item = await this.inventoryService.update(id, body);
    return {
      status: "success",
      message: "Inventory item updated",
      data: { item },
    };
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.inventoryService.delete(id);
    return { status: "success", message: "Inventory item deleted" };
  }

  @Put(":id/quantity")
  async updateQuantity(@Param("id") id: string, @Body() body: any) {
    const item = await this.inventoryService.updateQuantity(id, body);
    return {
      status: "success",
      message: "Inventory quantity updated",
      data: { item },
    };
  }

  @Get(":id/movements")
  async getMovements(
    @Param("id") id: string,
    @Query("locationId") locationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    const result = await this.inventoryService.getStockMovements(
      id,
      locationId || undefined,
      pageNum,
      limitNum,
    );
    return { status: "success", data: result };
  }

  @Post("transfers")
  async createTransfer(@Body() body: any) {
    const transfer = await this.inventoryService.createTransfer(body);
    return {
      status: "success",
      message: "Stock transfer created",
      data: { transfer },
    };
  }

  @Post("transfers/:id/receive")
  async receiveTransfer(@Param("id") id: string, @Body() body: any) {
    const transfer = await this.inventoryService.receiveTransfer(
      id,
      body,
    );
    return {
      status: "success",
      message: "Stock transfer received",
      data: { transfer },
    };
  }

  @Post("check-availability")
  async checkAvailability(@Body() body: any) {
    const result = await this.inventoryService.checkAvailability(
      body.items || [],
    );
    return { status: "success", data: result };
  }
}
