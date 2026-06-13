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
import { RecipesService } from "./recipes.service";

@ApiTags("recipes")
@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  async getAll(@Query("menu_item_id") menuItemId?: string) {
    const recipes = await this.recipesService.findAll(menuItemId);
    return {
      status: "success",
      data: { recipes, count: recipes.length },
    };
  }

  @Get("menu-item/:menuItemId")
  async getByMenuItem(@Param("menuItemId") menuItemId: string) {
    const recipe = await this.recipesService.findByMenuItemId(menuItemId);
    return { status: "success", data: { recipe } };
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    const recipe = await this.recipesService.findById(id);
    return { status: "success", data: { recipe } };
  }

  @Post()
  async create(@Body() body: any) {
    const recipe = await this.recipesService.create(body);
    return {
      status: "success",
      message: "Recipe created successfully",
      data: { recipe },
    };
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    const recipe = await this.recipesService.update(id, body);
    return {
      status: "success",
      message: "Recipe updated successfully",
      data: { recipe },
    };
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.recipesService.delete(id);
    return {
      status: "success",
      message: "Recipe deleted successfully",
    };
  }
}
