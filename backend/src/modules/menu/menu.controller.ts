import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Put,
  Delete,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { MenuService } from "./menu.service";
import {
  MainCategoriesResponseDto,
  MainCategoryRequestDto,
  MenuItemRequestDto,
  MenuItemResponseDto,
  MenuItemUpdateDto,
  MenuItemsResponseDto,
} from "./dto/menu.dto";
import { RequirePermission } from "../../common/permissions/require-permission.decorator";

@ApiTags("menu")
@RequirePermission("menu")
@Controller("menu")
export class MenuController {
  constructor(private menuService: MenuService) {}

  @ApiOperation({ summary: "Create a menu item" })
  @ApiBody({ type: MenuItemRequestDto })
  @ApiOkResponse({ type: MenuItemResponseDto })
  @Post()
  async createMenuItem(@Body() body: MenuItemRequestDto) {
    const menuItem = await this.menuService.create(body);
    return {
      status: "success",
      message: "Menu item created successfully",
      data: { menuItem },
    };
  }

  @ApiOperation({ summary: "Bulk sync menu items" })
  @Post("sync")
  async bulkSync(@Body() body: any) {
    const data = await this.menuService.syncBulk(body.menuItems || []);
    return {
      status: "success",
      message: "Menu items bulk sync successful",
      data,
    };
  }

  @ApiOperation({ summary: "List menu items with optional filters" })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "category", required: false, description: "Category slug" })
  @ApiQuery({ name: "categories", required: false, description: "Comma-separated category slugs" })
  @ApiQuery({ name: "match", required: false, description: "any or all" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "is_available", required: false, type: Boolean })
  @ApiOkResponse({ type: MenuItemsResponseDto })
  @Get()
  async getAllMenuItems(@Query() query: any) {
    const filters: any = {};
    if (query.type) filters.type = query.type;
    if (query.category) filters.category = query.category;
    if (query.categories) {
      filters.categories = String(query.categories)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (query.match) filters.match = query.match;
    if (query.search) filters.search = query.search;
    if (query.is_available !== undefined)
      filters.is_available = query.is_available === "true";
    const menuItems = await this.menuService.findAll(filters);
    return { status: "success", data: { menuItems, count: menuItems.length } };
  }

  @ApiOperation({ summary: "List categories" })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "is_active", required: false, type: Boolean })
  @ApiQuery({ name: "search", required: false })
  @Get("categories")
  async getCategories(@Query() query: any) {
    const categories = await this.menuService.findCategories({
      type: query.type,
      is_active:
        query.is_active === undefined ? undefined : query.is_active === "true",
      search: query.search,
    });
    return {
      status: "success",
      data: { categories, count: categories.length },
    };
  }

  @ApiOperation({ summary: "List main categories" })
  @ApiQuery({ name: "is_active", required: false, type: Boolean })
  @ApiQuery({ name: "search", required: false })
  @ApiOkResponse({ type: MainCategoriesResponseDto })
  @Get("main-categories")
  async getMainCategories(@Query() query: any) {
    const mainCategories = await this.menuService.findMainCategories({
      is_active:
        query.is_active === undefined ? undefined : query.is_active === "true",
      search: query.search,
    });

    return {
      status: "success",
      data: { mainCategories, count: mainCategories.length },
    };
  }

  @ApiOperation({ summary: "Create a main category" })
  @ApiBody({ type: MainCategoryRequestDto })
  @ApiOkResponse({ type: MainCategoriesResponseDto })
  @Post("main-categories")
  async createMainCategory(@Body() body: MainCategoryRequestDto) {
    const mainCategory = await this.menuService.createMainCategory(body);

    return {
      status: "success",
      message: "Main category created successfully",
      data: { mainCategories: [mainCategory], count: 1 },
    };
  }

  @ApiOperation({ summary: "Get cafe menu items" })
  @ApiOkResponse({ type: MenuItemsResponseDto })
  @Get("cafe")
  async getCafeMenu() {
    const menuItems = await this.menuService.getCafeMenu();
    return { status: "success", data: { menuItems, count: menuItems.length } };
  }

  @ApiOperation({ summary: "Get a menu item by ID" })
  @ApiParam({ name: "id", required: true })
  @ApiOkResponse({ type: MenuItemResponseDto })
  @Get(":id")
  async getMenuItem(@Param("id") id: string) {
    const menuItem = await this.menuService.findById(id);
    if (!menuItem) return { status: "error", message: "Menu item not found" };
    return { status: "success", data: { menuItem } };
  }

  @ApiOperation({ summary: "Update a menu item" })
  @ApiParam({ name: "id", required: true })
  @ApiBody({ type: MenuItemUpdateDto })
  @ApiOkResponse({ type: MenuItemResponseDto })
  @Put(":id")
  async updateMenuItem(
    @Param("id") id: string,
    @Body() body: MenuItemUpdateDto,
  ) {
    const updated = await this.menuService.update(id, body);
    return {
      status: "success",
      message: "Menu item updated successfully",
      data: { menuItem: updated },
    };
  }

  @ApiOperation({ summary: "Delete a menu item" })
  @ApiParam({ name: "id", required: true })
  @ApiOkResponse({ type: MenuItemResponseDto })
  @Delete(":id")
  async deleteMenuItem(@Param("id") id: string) {
    await this.menuService.delete(id);
    return { status: "success", message: "Menu item deleted successfully" };
  }

  @ApiOperation({ summary: "Toggle a menu item availability" })
  @ApiParam({ name: "id", required: true })
  @ApiOkResponse({ type: MenuItemResponseDto })
  @Post(":id/toggle-availability")
  async toggleAvailability(@Param("id") id: string) {
    const menuItem = await this.menuService.findById(id);
    if (!menuItem) return { status: "error", message: "Menu item not found" };
    const updated = await this.menuService.update(id, {
      is_available: !menuItem.is_available,
    });
    return {
      status: "success",
      message: `Menu item ${updated.is_available ? "enabled" : "disabled"} successfully`,
      data: { menuItem: updated },
    };
  }
}
