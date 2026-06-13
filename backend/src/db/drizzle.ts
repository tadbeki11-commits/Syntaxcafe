import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./tables/index";
import { config } from "dotenv";
config();

const connectionString =
  process.env.DATABASE_URL || "";

export const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

export default db;
