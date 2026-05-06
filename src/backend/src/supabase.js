import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const db = new Pool({
  connectionString: config.supabaseDbUrl,
  ssl: { rejectUnauthorized: false }
});

export async function query(sql, params = []) {
  return db.query(sql, params);
}
