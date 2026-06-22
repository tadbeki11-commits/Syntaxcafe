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
import { ExpensesService } from "./expenses.service";
import { RequirePermission } from "../../common/permissions/require-permission.decorator";

@ApiTags("expenses")
@RequirePermission("expenses")
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  async getAll(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("category") category?: string,
  ) {
    const expenses = await this.expensesService.findAll({ from, to, category });
    return { status: "success", data: { expenses, count: expenses.length } };
  }

  @Get("summary")
  async getSummary(@Query("from") from?: string, @Query("to") to?: string) {
    const summary = await this.expensesService.summary({ from, to });
    return { status: "success", data: summary };
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    const expense = await this.expensesService.findById(id);
    return { status: "success", data: { expense } };
  }

  @Post()
  async create(@Body() body: any) {
    const expense = await this.expensesService.create(body);
    return {
      status: "success",
      message: "Expense recorded",
      data: { expense },
    };
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    const expense = await this.expensesService.update(id, body);
    return { status: "success", message: "Expense updated", data: { expense } };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const expense = await this.expensesService.remove(id);
    return { status: "success", message: "Expense deleted", data: { expense } };
  }
}
