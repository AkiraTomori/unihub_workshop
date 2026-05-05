import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'unihub_workshop',
  },
  
  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default_access_secret_key_must_be_32_chars_long',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_key_must_be_32_chars_long',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },
  
  // Session
  session: {
    timeoutDays: parseInt(process.env.SESSION_TIMEOUT_DAYS) || 30,
  },
  
  // Bcrypt
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  },
  
  // CORS
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  },
};

export default config;
