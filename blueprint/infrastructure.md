# UniHub Workshop — Infrastructure & Environment Configuration

This document describes the local development infrastructure, environment variables, and deployment configuration for the UniHub Workshop system.

## Overview

The system uses Docker Compose to orchestrate a complete local development environment including:
- Node.js backend (Express API)
- PostgreSQL database
- Redis cache and lock store
- RabbitMQ message broker
- Optional: Local file storage for PDFs

All services can be launched with a single command: `docker-compose up -d`

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Local Development Environment               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Node.js     │  │  React Dev   │  │  React Native│          │
│  │  Backend     │  │  Server      │  │  Simulator   │          │
│  │  (Port 3000) │  │  (Port 3001) │  │  (Port 8081) │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                        │
│         ├──────────────────┐                                    │
│         │                  │                                    │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌────────────────┐          │
│  │ PostgreSQL  │  │   Redis     │  │   RabbitMQ    │          │
│  │ (Port 5432) │  │ (Port 6379) │  │ (Port 5672)   │          │
│  │             │  │             │  │ Admin: 15672  │          │
│  └─────────────┘  └─────────────┘  └────────────────┘          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │         File Storage (for PDFs & uploads)           │       │
│  │  Local: ./storage/uploads/ → Container: /uploads/   │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Docker Compose Configuration

**File: `docker-compose.yaml`**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: unihub_postgres
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "${DB_PORT}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - unihub_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: unihub_redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "${REDIS_PORT}:6379"
    volumes:
      - redis_data:/data
    networks:
      - unihub_network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: unihub_rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    ports:
      - "${RABBITMQ_PORT}:5672"
      - "15672:15672"  # Management UI
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - unihub_network
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./src/backend
      dockerfile: Dockerfile
    container_name: unihub_backend
    environment:
      NODE_ENV: ${NODE_ENV}
      APP_PORT: ${APP_PORT}
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USER: ${RABBITMQ_USER}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_EXPIRY: ${JWT_EXPIRY}
      SENDGRID_API_KEY: ${SENDGRID_API_KEY}
      VNPAY_API_KEY: ${VNPAY_API_KEY}
      VNPAY_API_ENDPOINT: ${VNPAY_API_ENDPOINT}
      MOMO_API_KEY: ${MOMO_API_KEY}
      MOMO_API_ENDPOINT: ${MOMO_API_ENDPOINT}
      VERTEX_AI_API_KEY: ${VERTEX_AI_API_KEY}
      VERTEX_AI_PROJECT_ID: ${VERTEX_AI_PROJECT_ID}
      VERTEX_AI_MODEL: ${VERTEX_AI_MODEL}
      LOG_LEVEL: ${LOG_LEVEL}
    ports:
      - "${APP_PORT}:${APP_PORT}"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    volumes:
      - ./src/backend:/app
      - ./storage/uploads:/uploads
    networks:
      - unihub_network

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:

networks:
  unihub_network:
    driver: bridge
```

## Environment Variables

### Core Application

| Variable | Description | Example | Required |
|---|---|---|---|
| `NODE_ENV` | Environment mode: development, staging, production | `development` | ✅ |
| `APP_PORT` | Port for Express server | `3000` | ✅ |
| `LOG_LEVEL` | Logging level: debug, info, warn, error | `info` | ✅ |

### Database (PostgreSQL)

| Variable | Description | Example | Required |
|---|---|---|---|
| `DB_HOST` | PostgreSQL host (in Docker: use service name) | `postgres` | ✅ |
| `DB_PORT` | PostgreSQL port | `5432` | ✅ |
| `DB_NAME` | Database name | `unihub_workshop` | ✅ |
| `DB_USER` | Database user | `workshop_user` | ✅ |
| `DB_PASSWORD` | Database password (use strong password in production) | `SecurePass123!` | ✅ |

**Connection String (for Knex or other database client):**
```
postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}
```

### Cache & Lock Store (Redis)

| Variable | Description | Example | Required |
|---|---|---|---|
| `REDIS_HOST` | Redis host | `redis` | ✅ |
| `REDIS_PORT` | Redis port | `6379` | ✅ |
| `REDIS_PASSWORD` | Redis password (leave empty for no auth in local dev) | `RedisPass123!` | ✅ |

**Connection String:**
```
redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}
```

### Message Broker (RabbitMQ)

| Variable | Description | Example | Required |
|---|---|---|---|
| `RABBITMQ_HOST` | RabbitMQ host | `rabbitmq` | ✅ |
| `RABBITMQ_PORT` | RabbitMQ AMQP port | `5672` | ✅ |
| `RABBITMQ_USER` | RabbitMQ user | `workshop_user` | ✅ |
| `RABBITMQ_PASSWORD` | RabbitMQ password | `RabbitPass123!` | ✅ |

**Connection String (amqplib):**
```
amqp://{RABBITMQ_USER}:{RABBITMQ_PASSWORD}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/
```

**Management UI Access:**
- URL: `http://localhost:15672`
- Username: `{RABBITMQ_USER}`
- Password: `{RABBITMQ_PASSWORD}`

### Authentication (JWT)

| Variable | Description | Example | Required |
|---|---|---|---|
| `JWT_SECRET` | Secret key for signing access tokens | `your-secret-key-min-32-chars-long!!!` | ✅ |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `your-refresh-secret-min-32-chars!!!` | ✅ |
| `JWT_EXPIRY` | Access token expiry (seconds) | `3600` (1 hour) | ✅ |

### Payment Gateway (Mock/Testing)

#### VNPay Configuration

| Variable | Description | Example | Required |
|---|---|---|---|
| `VNPAY_API_KEY` | VNPay API key (test/sandbox) | `MOCK-VNPAY-TEST-KEY-12345` | ✅ |
| `VNPAY_API_ENDPOINT` | VNPay API endpoint | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` | ✅ |
| `VNPAY_MERCHANT_CODE` | VNPay merchant code | `TMNCODE` | ✅ |
| `VNPAY_RETURN_URL` | Callback URL after payment | `http://localhost:3000/api/payments/webhook` | ✅ |

#### MoMo Configuration

| Variable | Description | Example | Required |
|---|---|---|---|
| `MOMO_API_KEY` | MoMo API key (test/sandbox) | `MOCK-MOMO-TEST-KEY-12345` | ✅ |
| `MOMO_API_ENDPOINT` | MoMo API endpoint | `https://test-payment.momo.vn/v2/gateway/api/create` | ✅ |
| `MOMO_PARTNER_CODE` | MoMo partner code | `MOMO123456` | ✅ |
| `MOMO_RETURN_URL` | Callback URL after payment | `http://localhost:3000/api/payments/webhook` | ✅ |

**Mock Payment Response Behavior (Development Only):**
- Request with `amount < 10000` → Simulates immediate SUCCESS
- Request with `amount >= 10000 && amount < 50000` → Simulates PENDING (timeout after 30s)
- Request with `amount >= 50000` → Simulates FAILED (connection timeout)

This allows testing of payment success, pending, and failure scenarios without real charges.

### Email Service (SendGrid)

| Variable | Description | Example | Required |
|---|---|---|---|
| `SENDGRID_API_KEY` | SendGrid API key for transactional emails | `SG.xxxxxxxxxxxxxxxxxxxxx` | ✅ |
| `SENDGRID_FROM_EMAIL` | Sender email address | `noreply@unihub.example.com` | ✅ |

### AI Integration (Vertex AI / Google Cloud)

| Variable | Description | Example | Required |
|---|---|---|---|
| `VERTEX_AI_API_KEY` | Google Cloud API key | `AIzaSyDxxxxxxxxxxxxx` | ✅ |
| `VERTEX_AI_PROJECT_ID` | Google Cloud project ID | `my-unihub-project-123` | ✅ |
| `VERTEX_AI_MODEL` | Model name for text generation | `gemini-pro` or `text-bison` | ✅ |
| `VERTEX_AI_LOCATION` | Google Cloud region | `us-central1` | ✅ |

**Note:** For local development without Vertex AI access, use a mock/stub implementation that returns placeholder summaries.

### Optional Configuration

| Variable | Description | Example | Default |
|---|---|---|---|
| `DATABASE_POOL_SIZE` | PostgreSQL connection pool size | `20` | `10` |
| `REDIS_DB` | Redis database number | `0` | `0` |
| `RABBITMQ_PREFETCH_COUNT` | RabbitMQ consumer prefetch count | `10` | `1` |
| `FILE_UPLOAD_DIR` | Directory for PDF uploads | `/uploads` | `/uploads` |
| `MAX_FILE_SIZE_MB` | Max PDF file size in MB | `50` | `50` |

## Local Development Setup

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (if running backend locally without Docker)
- Git

### Step 1: Create `.env` File

Copy the template:
```bash
cp .env.example .env
```

Edit `.env` and update values as needed:
```bash
# .env
NODE_ENV=development
APP_PORT=3000
LOG_LEVEL=debug

DB_HOST=postgres
DB_PORT=5432
DB_NAME=unihub_workshop
DB_USER=workshop_user
DB_PASSWORD=workshop_local_dev_password

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_local_dev_password

RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=workshop_user
RABBITMQ_PASSWORD=rabbitmq_local_dev_password

JWT_SECRET=your-super-secret-jwt-key-min-32-chars-required-here!!!
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-required-here!!!
JWT_EXPIRY=3600

SENDGRID_API_KEY=SG.test_key_for_development_only
SENDGRID_FROM_EMAIL=noreply@unihub-local.dev

VNPAY_API_KEY=MOCK-VNPAY-TEST-KEY
VNPAY_API_ENDPOINT=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_MERCHANT_CODE=TMNCODE

MOMO_API_KEY=MOCK-MOMO-TEST-KEY
MOMO_API_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_PARTNER_CODE=MOMO123456

VERTEX_AI_API_KEY=AIzaSyDxxxxxx (or MOCK for development)
VERTEX_AI_PROJECT_ID=unihub-dev-project
VERTEX_AI_MODEL=gemini-pro
VERTEX_AI_LOCATION=us-central1
```

### Step 2: Start Docker Compose

```bash
# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

### Step 3: Verify Services

```bash
# Check PostgreSQL
psql -h localhost -U workshop_user -d unihub_workshop

# Check Redis
redis-cli -h localhost -p 6379 -a redis_local_dev_password

# Check RabbitMQ Admin
# Open browser: http://localhost:15672
# Username: workshop_user
# Password: rabbitmq_local_dev_password

# Check Backend API Health
curl http://localhost:3000/api/health
```

## Production Deployment Checklist

- [ ] Use strong, randomly generated passwords for all services
- [ ] Store secrets in a secure vault (AWS Secrets Manager, Vault, etc.), not in `.env`
- [ ] Enable PostgreSQL SSL/TLS connections
- [ ] Enable RabbitMQ TLS and authentication
- [ ] Set `NODE_ENV=production` and `LOG_LEVEL=warn`
- [ ] Configure proper database backups and snapshots
- [ ] Set up monitoring, alerting, and log aggregation
- [ ] Use managed services (AWS RDS, ElastiCache, MQ) instead of self-hosted containers
- [ ] Implement CI/CD pipeline with automated tests and deployment
- [ ] Configure auto-scaling for API instances
- [ ] Set up CDN for static assets and PDF storage

## Health Checks & Monitoring

### Backend Health Endpoint

```bash
GET /api/health
```

Response (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-04-30T09:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "rabbitmq": "connected"
  }
}
```

### Service Logs

```bash
# Backend logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres

# RabbitMQ logs
docker-compose logs -f rabbitmq
```

### Performance Tuning

**PostgreSQL:**
- Adjust `max_connections`, `shared_buffers`, `effective_cache_size` based on load
- Enable query logging for slow queries: `log_min_duration_statement = 1000`

**Redis:**
- Monitor memory usage: `redis-cli info memory`
- Use persistence (RDB or AOF) if data durability is critical

**RabbitMQ:**
- Monitor queue depth: `rabbitmq-admin list_queues`
- Set up queue mirroring for high availability

## Troubleshooting

### PostgreSQL Connection Refused

```bash
# Check if service is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres
```

### Redis Connection Issues

```bash
# Test connection
redis-cli -h localhost -p 6379 -a YOUR_PASSWORD ping

# Should return: PONG
```

### RabbitMQ Not Accessible

```bash
# Check management UI
curl http://localhost:15672/api/health

# Should return 200 OK
```

### Backend Cannot Connect to Database

1. Verify DATABASE_URL in `.env` matches service name
2. Check docker-compose network: `docker network ls`
3. Ensure healthcheck passes: `docker-compose ps` (should show "healthy")
4. Run migrations: `npm run migrate`

## File Storage

PDFs uploaded by admins are stored locally in `./storage/uploads/` and mounted as `/uploads/` inside the backend container.

```bash
# View uploaded files
ls -la ./storage/uploads/

# Clear old uploads (optional)
find ./storage/uploads/ -mtime +30 -delete  # Delete files older than 30 days
```

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
