import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config/config.js';
import authRouter from './routers/auth.router.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', authRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    status: 'ERROR',
    message,
    code: err.code || 'INTERNAL_ERROR',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

export default app;
