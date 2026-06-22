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
import { ApiTags } from "@nestjs/swagger";
import { StockLocationsService } from "./stock-locations.service";
import { RequirePermission } from "../../common/permissions/require-permission.decorator";

@ApiTags("stock-locations")
@RequirePermission("stock_locations")
@Controller("stock-locations")
export class StockLocationsController {
  constructor(private readonly stockLocationsService: StockLocationsService) {}

  @Get()
  async getAll(@Query("include_inactive") includeInactive?: string) {
    const locations = await this.stockLocationsService.findAll(
      includeInactive === "true" || includeInactive === "1",
    );
    return {
      status: "success",
      data: { locations, count: locations.length },
    };
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    const location = await this.stockLocationsService.findById(id);
    return { status: "success", data: { location } };
  }

  @Get(":id/stock")
  async getStock(@Param("id") id: string) {
    const data = await this.stockLocationsService.getStockAtLocation(id);
    return { status: "success", data };
  }

  @Post()
  async create(@Body() body: any) {
    const location = await this.stockLocationsService.create(body);
    return {
      status: "success",
      message: "Stock location created",
      data: { location },
    };
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    const location = await this.stockLocationsService.update(id, body);
    return {
      status: "success",
      message: "Stock location updated",
      data: { location },
    };
  }

  @Delete(":id")
  async deactivate(@Param("id") id: string) {
    const location = await this.stockLocationsService.deactivate(id);
    return {
      status: "success",
      message: "Stock location deactivated",
      data: { location },
    };
  }
}
