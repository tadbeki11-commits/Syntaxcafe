import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import db from "../../db/drizzle";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @ApiOperation({ summary: "Check API and database health" })
  @Get()
  async status() {
    try {
      await db.execute("SELECT 1");
    } catch (err) {
      return { status: "error", error: String(err) };
    }
    return { status: "ok" };
  }
}
