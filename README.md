# UniHub Workshop — Project README

Tài liệu ngắn để thiết lập và chạy toàn bộ project (backend, frontend, workers, mobile) trong thư mục `src`.

## Tổng quan

Repo này có 3 lớp chính:

- `src/backend` — Express API, services, controllers, workers
- `src/frontend` — Vite + React SPA
- `src/mobile-rn` — React Native / Expo

Ngoài ra, project gốc có `docker-compose.yaml` để chạy toàn bộ hạ tầng bằng container:

- `frontend` trên cổng `5173`
- `backend` trên cổng `3000`
- `nginx` gateway trên cổng `8080`
- `redis`, `rabbitmq`
- 4 worker container riêng: `ai-summary-worker`, `csv-sync-worker`, `notification-worker`, `outbox-worker`

## 1) Thiết lập biến môi trường

### Backend

Copy `src/backend/.env.example` thành `src/backend/.env` rồi chỉnh các giá trị cần thiết:

- `DB_*` hoặc `DATABASE_URL`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `RABBITMQ_URL` hoặc `RABBITMQ_*`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- Các key khác như SMTP, Vertex AI, payment gateway

Lưu ý với Vertex AI: cần tạo Service Account trên Google Cloud Platform, cấp quyền phù hợp như `Vertex User` hoặc `Vertex AI User`, sau đó tạo key JSON để hệ thống được cấp quyền truy cập.

### Frontend

Copy `src/frontend/.env.example` thành `src/frontend/.env` nếu bạn muốn override cấu hình mặc định.

Mặc định frontend gọi API qua gateway:

- `VITE_API_BASE_URL=/api`
- `VITE_API_PROXY_TARGET=http://localhost:8080` khi chạy local

## 2) Chạy toàn bộ project bằng Docker Compose

Từ thư mục gốc của project:

```bash
docker compose up -d --build
```

Lệnh này sẽ khởi động:

- `frontend` ở `http://localhost:5173`
- `backend` ở `http://localhost:3000`
- `nginx` ở `http://localhost:8080`
- `redis`
- `rabbitmq`
- `ai-summary-worker`
- `csv-sync-worker`
- `notification-worker`
- `outbox-worker`

Nếu bạn chỉ muốn chạy gateway và hạ tầng phụ trợ, có thể chạy từng service theo nhu cầu, ví dụ:

```bash
docker compose up -d redis rabbitmq nginx
```

## 3) Các lệnh thường dùng với Docker

Xem trạng thái container:

```bash
docker compose ps
```

Xem log backend:

```bash
docker compose logs -f backend
```

Xem log từng worker:

```bash
docker compose logs -f ai-summary-worker
docker compose logs -f csv-sync-worker
docker compose logs -f notification-worker
docker compose logs -f outbox-worker
```

Tắt toàn bộ stack:

```bash
docker compose down
```

Tắt toàn bộ stack và xoá volume dữ liệu:

```bash
docker compose down -v
```

## 4) Chạy local từng phần nếu cần debug

### Backend

```bash
cd src/backend
npm install
npm run dev
```

Chạy production local:

```bash
npm start
```

Workers local:

```bash
npm run worker:all
npm run worker:ai-summary
npm run worker:csv-sync
npm run worker:notification
npm run worker:outbox
```

### Frontend

```bash
cd src/frontend
npm install
npm run dev
```

Build production:

```bash
npm run build
```

Preview bản build:

```bash
npm run preview
```

### Mobile

```bash
cd src/mobile-rn
npm install
npm run start
```

Hoặc:

```bash
npm run android
npm run ios
```

## 5) Dữ liệu và database

- Schema: `src/database/init.sql`
- Seed data: `src/database/data.sql`

Thứ tự khởi tạo đúng là:

1. Tạo database PostgreSQL / Supabase
2. Chạy `init.sql`
3. Chạy `data.sql` nếu muốn nạp dữ liệu mẫu

## 6) Kiến trúc container

- `frontend` và `backend` đều có Dockerfile riêng trong `src/frontend` và `src/backend`
- `nginx` không cần Dockerfile riêng, chỉ mount `infra/nginx/nginx.conf`
- 4 worker chạy độc lập trong container riêng, nhưng dùng chung image backend

## 7) Troubleshooting nhanh

- Nếu backend không lên, kiểm tra lại `src/backend/.env` và kết nối PostgreSQL / Supabase
- Nếu lỗi Redis hoặc RabbitMQ, xem lại mật khẩu và port trong `docker-compose.yaml`
- Nếu frontend không gọi được API, hãy kiểm tra `http://localhost:8080` và `VITE_API_BASE_URL`
- Nếu container cũ bị kẹt do dependency native, chạy lại:

```bash
docker compose down -v
docker compose up -d --build
```

## 8) Tệp quan trọng

- `docker-compose.yaml` — khai báo toàn bộ service container
- `infra/nginx/nginx.conf` — gateway proxy và rate limit
- `src/backend/controllers/` — API controllers
- `src/backend/services/` — business logic
- `src/backend/workers/` — worker entrypoints
- `src/database/init.sql` — schema
- `src/database/data.sql` — dữ liệu mẫu
