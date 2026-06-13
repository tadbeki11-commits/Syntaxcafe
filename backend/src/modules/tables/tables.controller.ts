import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TablesService } from "./tables.service";

@ApiTags("tables")
@Controller("tables")
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  async getAll() {
    const tables = await this.tablesService.findAll();
    return { status: "success", data: { tables, count: tables.length } };
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    const table = await this.tablesService.findById(id);
    return { status: "success", data: { table } };
  }

  @Post()
  async create(@Body() body: any) {
    const table = await this.tablesService.create(body);
    return { status: "success", message: "Table created", data: { table } };
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    const table = await this.tablesService.update(id, body);
    return { status: "success", message: "Table updated", data: { table } };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const table = await this.tablesService.remove(id);
    return { status: "success", message: "Table deleted", data: { table } };
  }

  @Post("sync")
  async sync(@Body() body: any) {
    const tables: any[] = Array.isArray(body?.tables) ? body.tables : [];
    const idMapping = await this.tablesService.syncBulk(tables);
    return {
      status: "success",
      message: "Tables synced",
      data: { idMapping, count: Object.keys(idMapping).length },
    };
  }
}
