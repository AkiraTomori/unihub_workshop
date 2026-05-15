# UniHub Workshop — Project README

Tài liệu ngắn để thiết lập và chạy toàn bộ project (backend, frontend, workers, mobile) trong thư mục `src`.

**Yêu cầu**
- Node.js 18+ 
- npm hoặc yarn
- PostgreSQL Supabase
- Docker & Docker Compose hoặc các dịch vụ Container khác (để chạy container Redis/RabbitMQ/nginx)

**Cấu trúc chính**
- Backend: `backend/` — API, workers, cấu hình
- Frontend: `frontend/` — Vite + React SPA
- Mobile: `mobile-rn/` — React Native (Expo)
- Database schema: `database/init.sql`
- Docker services (Redis, RabbitMQ, nginx): `docker-compose.yaml` (project root)

1) Thiết lập biến môi trường

- Backend có file mẫu: `backend/.env.example` — sao chép thành `backend/.env` và chỉnh các giá trị sau:
	- `DATABASE_URL` hoặc các biến DB riêng (HOST, PORT, USER, PASSWORD, DB)
	- `REDIS_URL`/`REDIS_PASSWORD`
	- `RABBITMQ_*` (user, password, host)
	- Các khóa API khác (SMTP, Vertex AI, payment gateway)

- Lưu ý: đối với VertexAI, cần tạo một Service Account ở trên Google Cloud Platform, Account đó cần có quyền Vertex User/Agent Platform User, sau đó cần tạo key để cho hệ thống được cấp quyền truy cập vào Vertex AI (Nếu như không tìm được Vertex AI thì tìm bằng Agent Platform)

- Frontend có file mẫu: `frontend/.env.example` — sao chép thành `frontend/.env` nếu cần. 

2) Khởi tạo cơ sở dữ liệu (Postgres)

- Tạo database (ví dụ `unihub`) và chạy file khởi tạo schema:
- Tạo tài khoản Supabase để sử dụng PostgreSQL.
- Sau đó lần lượt chạy file init.sql để tạo quan hệ các bảng trước, rồi mới tới data.sql để bổ sung dữ liệu vào

3) Chạy dịch vụ phụ trợ bằng Docker Compose (Redis, RabbitMQ, nginx)

Từ thư mục gốc của project (bên ngoài `src`):

```bash
docker compose up -d
```

Hoặc để khởi động từng dịch vụ:

```bash
docker compose up -d redis rabbitmq nginx
```

4) Chạy Backend (local)

```bash
cd src/backend
npm install
# sao chép và cấu hình .env theo bước (1)
npm run dev    # chạy với nodemon
# hoặc
npm start      # chạy production: node server.js
```

Workers (tách biệt, nếu cần chạy từng worker):

```bash
# ví dụ chạy mọi worker
npm run worker:all

# hoặc chạy từng worker riêng lẻ
npm run worker:ai-summary
npm run worker:csv-sync
npm run worker:outbox
npm run worker:notification
```

5) Chạy Frontend (local)

```bash
cd src/frontend
npm install
npm run dev

# build cho production
npm run build
# xem bản build cục bộ
npm run preview
```

6) Chạy Mobile (React Native / Expo)

```bash
cd src/mobile-rn
npm install
npm run start     # expo start
# hoặc
npm run android
npm run ios
```

7) Useful commands & debugging

- Kiểm tra logs backend: `pm2`/`docker logs` hoặc terminal nơi `npm run dev` chạy
- Kiểm tra Redis: `redis-cli -h localhost -p 6379 -a <password> ping`
- RabbitMQ management UI: http://localhost:15672 (default credentials trong `docker-compose.yaml`)

8) Tệp quan trọng
- API routes & controllers: `src/backend/controllers/`
- Services: `src/backend/services/`
- Workers: `src/backend/workers/`
- DB schema: `src/database/init.sql`
- Docker config: `docker-compose.yaml` (project root)

9) Troubleshooting nhanh
- Nếu backend không kết nối DB: kiểm tra `DATABASE_URL` / `pg` connection và rằng Postgres đang chạy.
- Lỗi Redis connection: kiểm tra `REDIS_PASSWORD` và port trong `docker compose`.
- Nếu gặp lỗi gửi email hoặc tích hợp bên thứ ba, kiểm tra biến môi trường SMTP / API keys.
