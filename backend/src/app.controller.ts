import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      status: "ok",
      message: "Cafe API is running",
      endpoints: {
        docs: "/api/docs",
        health: "/health",
      },
    };
  }
}
