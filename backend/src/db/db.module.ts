import { Module, Global, OnModuleInit, Logger } from "@nestjs/common";
import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool, db as drizzleDb } from "./drizzle";

@Global()
@Module({
  providers: [
    {
      provide: "PG_POOL",
      useValue: pool,
    },
    {
      provide: "DRIZZLE_DB",
      useValue: drizzleDb,
    },
  ],
  exports: ["PG_POOL", "DRIZZLE_DB"],
})
export class DbModule implements OnModuleInit {
  private readonly logger = new Logger(DbModule.name);

  async onModuleInit() {
    const client = await pool.connect();
    try {
      // await migrate(drizzleDb, {
      //   migrationsFolder: join(process.cwd(), "drizzle"),
      // });

      await client.query("SELECT 1");
      this.logger.log("✅ Database connection verified and migrations applied.");
    } catch (err) {
      this.logger.error("❌ Could not initialize the database.", err);
      process.exit(1);
    } finally {
      client.release();
    }
  }
}
