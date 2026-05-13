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

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password:
      process.env.REDIS_PASSWORD
      || (process.env.NODE_ENV !== 'production' ? 'redis_local_dev_password' : ''),
    get url() {
      const host = this.host;
      const port = this.port;
      const password = this.password;
      if (password) {
        return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
      }
      return `redis://${host}:${port}`;
    },
  },

  // Payment
  payment: {
    idempotencyTtlSeconds: Number(process.env.PAYMENT_IDEMPOTENCY_TTL_SECONDS || 86400),
    webhookSecret: process.env.WEBHOOK_SECRET || '',
  },

  // Circuit breaker (payment gateway)
  circuitBreaker: {
    failureThreshold: Number(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || 0.5),
    windowMs: Number(process.env.CIRCUIT_BREAKER_WINDOW_MS || 60000),
    openDurationMs: Number(process.env.CIRCUIT_BREAKER_OPEN_DURATION_MS || 300000),
    halfOpenMaxProbes: Number(process.env.CIRCUIT_BREAKER_HALF_OPEN_PROBES || 3),
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

  // SMTP Email
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },

  // Vertex AI
  vertexAI: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    modelName: process.env.VERTEX_AI_MODEL_NAME || 'gemini-2.5-flash',
  },
};

export default config;
