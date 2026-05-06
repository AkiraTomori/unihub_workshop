import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  supabaseDbUrl: process.env.SUPABASE_DB_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev_secret"
};

export function assertConfig() {
  const missing = [];
  if (!config.supabaseDbUrl) missing.push("SUPABASE_DB_URL");
  if (!config.jwtSecret) missing.push("JWT_SECRET");
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}
