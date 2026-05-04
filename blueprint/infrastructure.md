# UniHub Workshop — Infrastructure & Environment Configuration

This document describes the local development infrastructure, environment variables, and deployment configuration for the UniHub Workshop system.

## Overview

**Hybrid Deployment Strategy (Recommended for Academic Projects)**

The system uses a pragmatic hybrid approach:
- **Database**: Supabase PostgreSQL (managed cloud service, free tier with backups)
- **Message Broker**: RabbitMQ (Docker Compose, local development)
- **Cache & Locks**: Redis (Docker Compose, local development)
- **Backend**: Node.js Express (Docker or local)
- **Email Service**: Gmail SMTP (via Google account with App Password)
- **AI Summarization**: Google Cloud Vertex AI (covered by $300 free credit, using Gemini 1.5 Flash model)

**Benefits of this approach:**
- ✅ Data safety: Supabase provides automatic backups and disaster recovery
- ✅ Demo-friendly: Access DB from any network (no ngrok needed)
- ✅ Cost-effective: All services are free or credit-based for academic use
- ✅ Production-ready patterns: Event-driven architecture with Outbox Pattern

Local services (Redis, RabbitMQ) can be launched with: `docker-compose up -d`

## System Architecture Diagram (Hybrid Deployment)

```mermaid
graph TB
    subgraph Dev_Environment ["Development Environment"]
        direction TB
        
        subgraph Local_Runtime ["Local Runtime Services"]
            direction LR
            BE["Node.js Backend<br/>(Port 3000)"]
            WEB["React Dev Server<br/>(Port 3001)"]
            MOB["React Native Simulator<br/>(Port 8081)"]
        end

        subgraph Infrastructure ["Infrastructure Layer"]
            direction LR
            subgraph Docker_Compose ["Local Docker Compose"]
                direction TB
                REDIS[("Redis<br/>(Port 6379)")]
                MQ["RabbitMQ<br/>(Port 5672)<br/>Admin: 15672"]
            end

            subgraph Google_Cloud ["Google Cloud (Managed)"]
                direction TB
                DB[("Supabase<br/>PostgreSQL")]
                AI["Vertex AI<br/>(Gemini Flash)"]
                SMTP["Gmail SMTP<br/>(App Password)"]
            end
        end

        subgraph Storage ["File Storage"]
            FS["PDF Storage<br/>Local: ./storage/uploads/<br/>Mount: /uploads/ (backend)"]
        end
    end

    %% Connections
    BE ==> REDIS
    BE ==> MQ
    BE ==> DB
    BE ==> AI
    BE ==> SMTP
    BE -.-> FS
    WEB ==> BE
    MOB ==> BE

    style Dev_Environment fill:#ffffff,stroke:#333,stroke-width:2px,color:#333
    style Infrastructure fill:#ffffff,stroke:#333,stroke-width:2px,color:#333
    style Storage fill:#ffffff,stroke:#333,stroke-width:2px,color:#333
    
    style Docker_Compose fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#01579b
    style Google_Cloud fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#e65100
    style Local_Runtime fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#4a148c
    
    style BE fill:#4CAF50,color:#fff,font-weight:bold
    style DB fill:#FF9800,color:#fff,font-weight:bold
    style AI fill:#2196F3,color:#fff,font-weight:bold

    linkStyle default stroke:#333,stroke-width:2px;
```

## Docker Compose Configuration

**File: `docker-compose.yaml`** (Local services: Redis + RabbitMQ only)

```yaml
version: '3.8'

services:
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
      # Database: Supabase (Cloud PostgreSQL with Connection Pooling)
      DB_HOST: ${DB_HOST}  # e.g., aws-0-ap-southeast-1.pooler.supabase.com
      DB_PORT: ${DB_PORT}  # 6543 (pooler) or 5432 (direct)
      DB_NAME: ${DB_NAME}  # postgres
      DB_USER: ${DB_USER}  # postgres.[project-ref]
      DB_PASSWORD: ${DB_PASSWORD}  # Supabase database password
      # Cache: Redis (Local Docker)
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      # Message Broker: RabbitMQ (Local Docker)
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USER: ${RABBITMQ_USER}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
      # Authentication & JWT
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_EXPIRY: ${JWT_EXPIRY}
      # Email: Gmail SMTP (replaces SendGrid)
      SMTP_HOST: ${SMTP_HOST}  # smtp.gmail.com
      SMTP_PORT: ${SMTP_PORT}  # 587
      SMTP_USER: ${SMTP_USER}  # your-email@gmail.com
      SMTP_PASS: ${SMTP_PASS}  # 16-character App Password from Gmail
      # Payment Gateways: VNPay & Momo
      VNPAY_API_KEY: ${VNPAY_API_KEY}
      VNPAY_API_ENDPOINT: ${VNPAY_API_ENDPOINT}
      MOMO_API_KEY: ${MOMO_API_KEY}
      MOMO_API_ENDPOINT: ${MOMO_API_ENDPOINT}
      # AI: Vertex AI Gemini 1.5 Flash
      GOOGLE_CLOUD_PROJECT: ${GOOGLE_CLOUD_PROJECT}
      VERTEX_AI_MODEL: ${VERTEX_AI_MODEL}  # gemini-1.5-flash-001
      # Application
      LOG_LEVEL: ${LOG_LEVEL}
    ports:
      - "${APP_PORT}:${APP_PORT}"
    depends_on:
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

### Database (Supabase PostgreSQL)

| Variable | Description | Example | Required |
|---|---|---|---|
| `DB_HOST` | Supabase PostgreSQL pooler host | `aws-0-ap-southeast-1.pooler.supabase.com` | ✅ |
| `DB_PORT` | Pooler port (connection pooling) | `6543` | ✅ |
| `DB_NAME` | Database name | `postgres` | ✅ |
| `DB_USER` | Supabase user (project-scoped) | `postgres.abc123def` | ✅ |
| `DB_PASSWORD` | Supabase database password | `YourSuperSecurePassword123!` | ✅ |

**Supabase Connection String Format:**
```
postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=require
```

**Notes:**
- Use **pooler** connection (port `6543`) for short-lived connections from backend/workers
- Use **direct** connection (port `5432`) only for long-running transactions or migrations
- Supabase includes SSL/TLS encryption by default; `sslmode=require` ensures encrypted connection
- Connection pooling via PgBouncer: 100 connections per project (free tier); scales with higher plans

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

### Email Service (Gmail SMTP)

| Variable | Description | Example | Required |
|---|---|---|---|
| `SMTP_HOST` | Gmail SMTP server address | `smtp.gmail.com` | ✅ |
| `SMTP_PORT` | SMTP port for TLS | `587` | ✅ |
| `SMTP_USER` | Gmail account (full email address) | `your-email@gmail.com` | ✅ |
| `SMTP_PASS` | Gmail App Password (16 chars, generated from Account Settings) | `abcd efgh ijkl mnop` | ✅ |

**Gmail Setup Instructions:**
1. Enable 2-Factor Authentication on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Select "Mail" and "Windows Computer" → Copy 16-character password to `SMTP_PASS`
4. Use `SMTP_USER` as your Gmail address (e.g., student@gmail.com)

**Notes:**
- Gmail SMTP limit: **500 emails/day** (sufficient for development/demo; scale to AWS SES or SendGrid in production)
- Uses **TLS encryption** on port 587 (standard for email services)
- App Passwords work even if Google 2FA is enabled; more secure than account password
- Easy switchover to AWS SES or SendGrid via .env variable change (code unchanged)

### AI Integration (Vertex AI / Google Cloud)

| Variable | Description | Example | Required |
|---|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | `my-unihub-project-123` | ✅ |
| `VERTEX_AI_MODEL` | Gemini model for text generation | `gemini-1.5-flash-001` | ✅ |

**Model Selection Strategy:**
- **Development/Demo:** Use `gemini-1.5-flash-001` (90% capability, 70% lower cost)
- **Production:** Can upgrade to `gemini-1.5-pro-001` (higher capability, proportionally more cost)
- Code remains unchanged; only model name in `.env` changes

**Cost Estimation (300$ GCP Credit):**
- Gemini 1.5 Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- Estimated usage: ~50-100 workshop PDF summaries/day during demo = ~500K tokens/day = ~$37.50/month
- Credit lasts: 300$ ÷ 37.50 = **8 months of demo usage**

**Notes:**
- Application credentials via `GOOGLE_APPLICATION_CREDENTIALS` environment variable (path to service account JSON key)
- Requires GCP project with Vertex AI API enabled and service account with Vertex AI User role
- Rate limiting recommended: 1 PDF per request, max 10 summaries/minute to preserve credit

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

Edit `.env` and update values for Supabase + local services:
```bash
# .env — Hybrid Development Setup
NODE_ENV=development
APP_PORT=3000
LOG_LEVEL=debug

# Database: Supabase (Cloud PostgreSQL)
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com  # Replace with your Supabase region
DB_PORT=6543                                       # Pooler port (connection pooling)
DB_NAME=postgres
DB_USER=postgres.abc123def456                      # Replace with your Supabase project ID
DB_PASSWORD=your-super-strong-supabase-password   # Your Supabase database password

# Cache: Redis (Local Docker)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_local_dev_password

# Message Queue: RabbitMQ (Local Docker)
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=workshop_user
RABBITMQ_PASSWORD=rabbitmq_local_dev_password

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-required-here!!!
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-required-here!!!
JWT_EXPIRY=3600

# Email: Gmail SMTP (replaces SendGrid)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com             # Your Gmail address
SMTP_PASS=abcd efgh ijkl mnop              # 16-char app password from Gmail account

# Payment Gateways (Mock for Development)
VNPAY_API_KEY=MOCK-VNPAY-TEST-KEY
VNPAY_API_ENDPOINT=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_MERCHANT_CODE=TMNCODE

MOMO_API_KEY=MOCK-MOMO-TEST-KEY
MOMO_API_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_PARTNER_CODE=MOMO123456

# AI: Vertex AI (Google Cloud) — Gemini 1.5 Flash
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
VERTEX_AI_MODEL=gemini-1.5-flash-001       # Flash for development (cost-optimized)
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
# Check Supabase PostgreSQL (Cloud)
psql "postgresql://postgres.abc123:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Check Redis (Local Docker)
redis-cli -h localhost -p 6379 -a redis_local_dev_password

# Check RabbitMQ Admin
# Open browser: http://localhost:15672
# Username: workshop_user
# Password: rabbitmq_local_dev_password

# Check Backend API Health
curl http://localhost:3000/api/health
```

## Production Deployment Checklist

**Hybrid Deployment (Current Development Setup):**
- [ ] Use strong, randomly generated passwords for all services (Supabase, Gmail, RabbitMQ)
- [ ] Store secrets in a secure vault (AWS Secrets Manager, Vault, 1Password, etc.), not in `.env`
- [ ] Verify Supabase SSL/TLS enforced (sslmode=require in connection string)
- [ ] Enable RabbitMQ TLS and authentication (if externally accessible)
- [ ] Set `NODE_ENV=production` and `LOG_LEVEL=warn` on production deployment
- [ ] Configure Supabase backups and PITR (Point-in-Time Recovery)
- [ ] Set up monitoring for Vertex AI API usage to prevent unexpected costs
- [ ] Enable audit logging in Supabase for compliance tracking

**Production Upgrade Path (When Scaling Beyond Demo):**
- [ ] Migrate Supabase free tier → Supabase paid tier or AWS RDS
- [ ] Replace local Redis Docker → AWS ElastiCache (Redis)
- [ ] Replace local RabbitMQ Docker → AWS MQ (Managed RabbitMQ) or SQS
- [ ] Upgrade Gmail SMTP → AWS SES, SendGrid, or Postmark (higher rate limits)
- [ ] Upgrade Vertex AI Gemini Flash → Gemini Pro (higher capability)
- [ ] Implement CI/CD pipeline with automated tests and deployment
- [ ] Configure auto-scaling for API instances
- [ ] Set up CDN (CloudFront/Cloudflare) for static assets and PDF storage
- [ ] Enable WAF (Web Application Firewall) on API endpoint

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

# Redis logs (Local Docker)
docker-compose logs -f redis

# RabbitMQ logs (Local Docker)
docker-compose logs -f rabbitmq

# Supabase Database Logs (Cloud)
# View in Supabase Dashboard → Project Settings → Logs
```

### Performance Tuning

**Supabase PostgreSQL (Cloud):**
- Monitor connection pool usage: Supabase Dashboard → Project Settings → Database
- For high concurrency, increase pooler connection count (available in paid plans)

**Supabase PostgreSQL (Cloud):**
- Monitor connection pool usage: Supabase Dashboard → Project Settings → Database
- For high concurrency, increase pooler connection count (available in paid plans)
- Check query performance: Supabase Dashboard → Project Settings → Database → Query Performance

**Local Services (Redis, RabbitMQ):**
- Monitor memory usage: `redis-cli info memory`
- Monitor queue depth: Check RabbitMQ Dashboard → Queues
- Enable persistence for Redis if data durability is critical

**Application-Level:**
- Set `NODE_ENV=production` and enable caching headers for static assets
- Rate limit API endpoints to prevent abuse (see security.md for details)
- Monitor Vertex AI API usage to control costs

## Troubleshooting

### Supabase Connection Issues

```bash
# Test Supabase connection
psql "postgresql://postgres.abc123:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Common causes:
# 1. Wrong connection string: Copy from Supabase Dashboard → Project Settings → Database
# 2. Wrong password: Verify your database password (reset in Project Settings if needed)
# 3. Network blocked: Check firewall; Supabase allows all IPs by default
# 4. Connection pool exhausted: Use pooler port (6543) instead of direct port (5432) for short-lived connections

# Verify Supabase is running
curl https://api.supabase.co/v1/projects  # (requires auth header; just tests connectivity)
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

**If backend logs show database connection errors:**

1. Verify `.env` variables match Supabase project (from Project Settings → Database):
   ```bash
   DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   DB_PORT=6543
   DB_NAME=postgres
   DB_USER=postgres.abc123def
   DB_PASSWORD=your-correct-password
   ```

2. Test connection manually:
   ```bash
   psql "postgresql://postgres.abc123:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
   ```

3. If connection refused:
   - Wrong password: Reset in Supabase Dashboard → Project Settings → Database
   - Wrong host/region: Check region matches your project (e.g., ap-southeast-1 for Vietnam)
   - Firewall: Supabase allows all IPs; check your local firewall

4. Run migrations to sync schema:
   ```bash
   npm run migrate
   ```

5. Check health endpoint:
   ```bash
   curl http://localhost:3001/api/health

## File Storage

PDFs uploaded by admins are stored locally in `./storage/uploads/` and mounted as `/uploads/` inside the backend container.

```bash
# View uploaded files
ls -la ./storage/uploads/

# Clear old uploads (optional)
find ./storage/uploads/ -mtime +30 -delete  # Delete files older than 30 days
```

## Hybrid Deployment Architecture

### Rationale

The hybrid deployment strategy balances **cost**, **reliability**, and **demo-ability** for a student project:

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Database** | ☁️ Supabase (Cloud) | Disaster recovery (prevents data loss from local machine failure); remote demo access via 4G; professional dashboard for live data viewing during presentation |
| **Cache** | 🐳 Redis (Local Docker) | Cloud versions ($15-30/mo) exceed demo budget; local adequate for development; Valkey/Redis layer unchanged if migrating to ElastiCache later |
| **Message Queue** | 🐳 RabbitMQ (Local Docker) | Managed AWS MQ/RabbitMQ Cloud expensive; local sufficient for development; code-independent (can swap to SQS if needed) |
| **Email** | 📧 Gmail SMTP | No verification complexity; works immediately with 2FA + App Password; 500/day limit adequate for demo; simple switchover to AWS SES or SendGrid in `.env` |
| **AI** | 🤖 Vertex AI (Google Cloud) | Gemini 1.5 Flash 90% capability, 70% cheaper than Pro; fits within 300$ GCP credit budget; text-generation core capability unchanged |

### Cost Summary (300$ GCP Credit)

| Service | Cost/Month | Quantity | Total | Credit Impact |
|---------|-----------|----------|-------|----------------|
| Supabase PostgreSQL | Free tier (50MB, 2 concurrent) | 1 | $0 | $0 |
| Supabase Storage | Free tier (1GB) | 1 | $0 | $0 |
| Gmail SMTP | Included (500/day free) | ∞ | $0 | $0 |
| Vertex AI Gemini 1.5 Flash | $0.075/1M input + $0.30/1M output | ~500K tokens/day | ~$37.50 | $37.50 |
| **Total** | — | — | **~$37.50/month** | **8 months of credit** |

### Production Path

When scaling to production, upgrade services without code changes:

```
Development (Hybrid)          →    Production (Cloud-Native)
─────────────────────────────────────────────────────────
Supabase PostgreSQL           →    AWS RDS PostgreSQL + Read Replicas
Local Redis Docker            →    AWS ElastiCache (Redis)
Local RabbitMQ Docker         →    AWS MQ (Managed RabbitMQ)
Gmail SMTP (500/day)          →    AWS SES (10K emails/day free tier)
Vertex AI Gemini Flash        →    Gemini Pro / Claude API
```

Code changes: **None** (all services accessed via environment variables)

## Supabase Setup Walkthrough

### Step 1: Create Supabase Project

1. Go to https://supabase.com → Sign up (free tier)
2. Click "New Project"
3. Enter:
   - **Project Name:** `unihub-workshop`
   - **Password:** Strong database password (save it!)
   - **Region:** Select closest to your location (e.g., `ap-southeast-1` for Vietnam)
4. Click "Create new project" → Wait ~2 minutes for provisioning
5. Go to **Project Settings** → **Database**:
   - Copy **"Connection string"** → Select **"Pooler"** mode
   - Format: `postgresql://postgres.[project-id]:[password]@[host]:[port]/postgres?sslmode=require`

### Step 2: Apply Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of [init.sql](../database/init.sql) 
3. Paste into Supabase SQL Editor → Click "Run"
4. Verify tables created: `USERS`, `ROOMS`, `WORKSHOPS`, `REGISTRATIONS`, `PAYMENTS`, etc.

### Step 3: Seed Test Data (Optional)

1. Go to **SQL Editor** → New query
2. Copy contents of [data.sql](../database/data.sql)
3. Paste → Click "Run"
4. Verify data: Open any table → Should see test records (admin user, sample workshops, etc.)

### Step 4: Update Backend `.env`

Update your `.env` file with Supabase connection details:

```bash
# From Supabase Project Settings → Database
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com  # Replace with your region
DB_PORT=6543                                       # Pooler port (connection pooling)
DB_NAME=postgres
DB_USER=postgres.abc123def456                      # Replace with your project ID
DB_PASSWORD=your-super-strong-password-here        # Your database password
```

### Step 5: Test Connection

```bash
# From project root, test Knex migration
npm run migrate

# Or test connection manually
psql "postgresql://postgres.[project-id]:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
```

### Supabase Useful Links

- **Dashboard:** https://supabase.com/dashboard
- **Connection String:** Project Settings → Database → Connection Pooler
- **Documentation:** https://supabase.com/docs
- **Free Tier Limits:** 50MB storage, 2 concurrent connections, 500MB bandwidth/day

## Gmail App Password Setup

### Step 1: Enable 2-Factor Authentication (2FA)

1. Go to https://myaccount.google.com/security
2. Click **"2-Step Verification"** → Enable if not already active
3. Choose verification method (SMS or authenticator app recommended)

### Step 2: Generate App Password

1. After enabling 2FA, go back to **Security** page
2. Scroll down → Click **"App passwords"** (only visible if 2FA is enabled)
3. Select:
   - **App:** "Mail"
   - **Device:** "Windows Computer" (or your OS)
4. Click **"Generate"** → Google creates a **16-character password**
5. Copy the password (without spaces): `abcdefghijklmnop`

### Step 3: Update Backend `.env`

Add to your `.env` file:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com              # Your Gmail address
SMTP_PASS=abcdefghijklmnop                  # 16-char app password from step 2
```

### Step 4: Test Email Service

```bash
# Option 1: Use Node REPL
node
> const nodemailer = require('nodemailer');
> const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: 'your-email@gmail.com', pass: 'your-app-password' }
  });
> transporter.verify((err, success) => console.log(err || success));
// Should return: true

// Option 2: Run backend and trigger email action
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
// Check test@example.com inbox for verification email
```

### Gmail Notes

- **Rate Limit:** 500 emails/day (sufficient for development/demo)
- **Security:** App passwords are safer than storing main Gmail password in `.env`
- **Production Switch:** When ready to scale, change `SMTP_HOST` and credentials to AWS SES or SendGrid (code unchanged)
- **Test Account:** Create a separate Gmail account for testing to avoid cluttering personal email

## Vertex AI Cost Optimization

### Why Gemini 1.5 Flash for Development

| Model | Input Cost | Output Cost | Capability | Best For |
|-------|-----------|------------|-----------|----------|
| Gemini 1.5 Flash | $0.075/1M tokens | $0.30/1M tokens | 90% of Pro | **Development, Demo (Cost-optimized)** |
| Gemini 1.5 Pro | $0.15/1M tokens | $0.60/1M tokens | 100% capability | Production, Complex reasoning |

**Cost difference:** Flash is ~60-70% cheaper for same core tasks (PDF summarization, text generation)

### Rate Limiting Strategy (Preserve 300$ Credit)

Implement rate limiting in backend AI Worker:

```javascript
// src/backend/services/ai-worker.js
const MAX_PDFS_PER_REQUEST = 1;      // Process 1 PDF per request
const MAX_REQUESTS_PER_MINUTE = 10;  // Max 10 summary requests/minute
const MAX_TOKENS_PER_DAY = 100000;   // ~2.70$ usage cap/day

// Pseudo-code
async function summarizeWorkshopPDF(filePath) {
  // Check daily token budget
  const tokensUsedToday = await redis.get('vertex_ai_tokens_today');
  if (tokensUsedToday > MAX_TOKENS_PER_DAY) {
    throw new Error('Daily token limit reached; try again tomorrow');
  }
  
  // Summarize via Vertex AI
  const response = await vertexAI.generateContent({...});
  
  // Track token usage
  await redis.incrby('vertex_ai_tokens_today', response.usageMetadata.totalTokenCount);
  return response.text;
}
```

### Testing Strategy Within Budget

1. **Phase 1 (Week 1-2):** Test with 5-10 workshop PDFs
   - Estimated tokens: ~50K
   - Estimated cost: $1.50

2. **Phase 2 (Week 3-4):** Full demo scenario (30-50 workshops)
   - Estimated tokens: ~200K
   - Estimated cost: $6.00

3. **Phase 3 (Ongoing):** Live demo + presentation
   - Estimated tokens: ~20K/demo session
   - Budget for 10-15 demo sessions: ~$300

**Total within 300$ credit:** ~8 months of development + full demo scenarios

### Production Upgrade Path

When moving to production, change `.env` to `gemini-1.5-pro-001`:

```bash
# .env
VERTEX_AI_MODEL=gemini-1.5-pro-001  # Change from flash to pro (code unchanged)
```

Estimated production cost: ~$100-200/month (depending on usage)

## Migration Guide: Local Docker PostgreSQL → Supabase

### Prerequisites

- Existing local development environment with Docker running
- PostgreSQL data to migrate
- Supabase project created (see Supabase Setup Walkthrough above)

### Step 1: Export Local PostgreSQL Data

```bash
# From project root directory
docker-compose exec postgres pg_dump -U workshop_user unihub_workshop > local_backup.sql

# Verify export
wc -l local_backup.sql  # Should have 1000+ lines
```

### Step 2: Create Schema in Supabase

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy contents of [init.sql](../database/init.sql)
3. Paste and run → Verify tables created

### Step 3: Import Data into Supabase

**Option A (Recommended):** Via Supabase SQL Editor
```bash
1. Download local_backup.sql (from Step 1)
2. Supabase Dashboard → SQL Editor → "New query"
3. Upload local_backup.sql or paste contents
4. Run
```

**Option B:** Via psql CLI
```bash
# Using Supabase connection string (replace with your details)
psql "postgresql://postgres.abc123:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require" < local_backup.sql
```

### Step 4: Update Backend `.env`

```bash
# Old (Local Docker)
DB_HOST=postgres
DB_PORT=5432

# New (Supabase Cloud)
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.abc123def  # Your project-scoped user
DB_PASSWORD=your-supabase-password
```

### Step 5: Restart Backend

```bash
# Stop old backend (with local DB)
docker-compose down

# Update docker-compose.yaml (remove postgres service, keep redis+rabbitmq)
# ✅ Already done in this updated infrastructure.md

# Start backend with Supabase
docker-compose up -d backend
```

### Step 6: Verify Migration

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check database connection
npm run migrate

# Verify data in Supabase
# Dashboard → Table Editor → Open USERS, WORKSHOPS, etc.
```

### Rollback (If Needed)

If issues occur, rollback to local PostgreSQL:
```bash
# Restore local DB from backup
docker-compose exec postgres psql -U workshop_user unihub_workshop < local_backup.sql

# Revert .env to local settings
DB_HOST=postgres
DB_PORT=5432
```

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
