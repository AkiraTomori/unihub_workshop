import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
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

  // RabbitMQ
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },

  // Supabase Storage
  storage: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    documentBucket: process.env.DOCUMENT_BUCKET || 'documents',
  },

  // CSV Sync
  csvSync: {
    filePath: process.env.CSV_FILE_PATH || '',
    runOnStartup: process.env.RUN_ON_STARTUP === 'true',
  },

  // Workers
  worker: {
    debug: process.env.WORKER_DEBUG === 'true',
    maxSummaryLength: Number(process.env.MAX_SUMMARY_LENGTH || 1800),
  },

  // Vertex AI
  vertexAI: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    modelName: process.env.VERTEX_AI_MODEL_NAME || 'gemini-2.5-flash',
  },
};

export default config;
