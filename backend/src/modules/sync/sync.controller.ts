import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { SyncService } from "./sync.service";

@Controller("sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get("changes")
  getChanges(
    @Query("since") since?: string,
    @Query("limit") limit?: string,
  ) {
    return this.syncService.getChanges(Number(since ?? 0), Number(limit ?? 500));
  }

  @Post("events")
  ingestEvents(@Body() body: { events?: any[] }) {
    return this.syncService.ingestEvents(body?.events ?? []);
  }
}
