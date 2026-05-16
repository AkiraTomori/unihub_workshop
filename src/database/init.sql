-- 0. CLEAN UP PREVIOUS DATA (Reset DB)
-- =================================================================================
-- Xóa toàn bộ các bảng cũ (CASCADE để tự động xóa luôn các Khóa ngoại đang ràng buộc)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS outbox_events CASCADE;
DROP TABLE IF EXISTS csv_sync_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS workshops CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Xóa các ENUM Type cũ
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS workshop_status_enum CASCADE;
DROP TYPE IF EXISTS document_status_enum CASCADE;
DROP TYPE IF EXISTS registration_status_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS sync_status_enum CASCADE;
DROP TYPE IF EXISTS outbox_status_enum CASCADE;
DROP TYPE IF EXISTS notification_status_enum CASCADE;
DROP TYPE IF EXISTS notification_channel_enum CASCADE;

-- Xóa hàm Trigger cũ
DROP FUNCTION IF EXISTS trigger_set_timestamp() CASCADE;

-- 1. UTILITY FUNCTIONS & EXTENSIONS
-- =================================================================================
-- Cài đặt extension để sinh UUIDv4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hàm tự động cập nhật cột updated_at khi có sự kiện UPDATE
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. CREATE ENUM TYPES (Chuẩn hóa dữ liệu nghiệp vụ)
-- =================================================================================
CREATE TYPE user_role_enum AS ENUM ('STUDENT', 'ADMIN', 'CHECKER');
CREATE TYPE workshop_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');
CREATE TYPE document_status_enum AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE registration_status_enum AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE sync_status_enum AS ENUM ('PROCESSING', 'SUCCESS', 'FAILED');
CREATE TYPE outbox_status_enum AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');
CREATE TYPE notification_status_enum AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE notification_channel_enum AS ENUM ('EMAIL', 'IN_APP', 'PUSH');

-- 3. CREATE TABLES
-- =================================================================================

-- 3.1. ROOMS (Không gian tổ chức)
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    map_image_url VARCHAR(255),
    base_capacity INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Soft delete flag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2. USERS (Quản lý Sinh viên, Admin, Nhân sự)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_code VARCHAR(20) UNIQUE, -- Có thể NULL nếu là Admin
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Bắt buộc theo thiết kế mới
    full_name VARCHAR(100) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'STUDENT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Cờ khóa tài khoản
    last_synced_at TIMESTAMP WITH TIME ZONE, -- Lần cuối đồng bộ CSV
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.3. USER_SESSIONS (Quản lý phiên đăng nhập/Token)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(50),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.4. WORKSHOPS (Thông tin Sự kiện chính)
CREATE TABLE workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT, -- Mô tả hiển thị frontend
    speaker VARCHAR(255), -- Tên diễn giả / presenter
    cover_image_url VARCHAR(255), -- Ảnh banner
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    capacity INT NOT NULL CHECK (capacity >= 0),
    registered_count INT NOT NULL DEFAULT 0 CHECK (registered_count >= 0),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status workshop_status_enum NOT NULL DEFAULT 'DRAFT',
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.5. DOCUMENTS (File đính kèm & AI Summary)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL UNIQUE REFERENCES workshops(id) ON DELETE CASCADE,
    pdf_url VARCHAR(255) NOT NULL,
    ai_summary TEXT,
    process_status document_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.6. REGISTRATIONS (Vé tham dự sự kiện)
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
    status registration_status_enum NOT NULL DEFAULT 'PENDING_PAYMENT',
    expires_at TIMESTAMP WITH TIME ZONE, -- Thời hạn giữ vé
    qr_code VARCHAR(100) NOT NULL UNIQUE,
    offline_sync_id VARCHAR(100), -- Khóa chống trùng cho Sync Offline
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ràng buộc quan trọng: 1 Sinh viên không được mua 2 vé cho 1 Workshop trừ khi vé trước đã hủy
CREATE UNIQUE INDEX idx_unique_active_registration 
ON registrations (user_id, workshop_id) 
WHERE status != 'CANCELLED';

-- 3.7. PAYMENTS (Giao dịch tài chính)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    provider VARCHAR(50) NOT NULL, -- VNPay, MoMo
    transaction_id VARCHAR(100), -- Mã GD từ đối tác
    idempotency_key VARCHAR(100) NOT NULL UNIQUE, -- Chống trừ tiền 2 lần
    status payment_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.8. CHECKINS (Lịch sử quét mã vào cửa)
CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
    device_id VARCHAR(100) NOT NULL, -- Nhận diện máy quét
    scanned_at TIMESTAMP WITH TIME ZONE NOT NULL,
    offline_sync_id VARCHAR(100) UNIQUE, -- ID do WatermelonDB sinh ra
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.9. AUDIT_LOGS (Nhật ký Truy vết hệ thống)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Ai thực hiện
    entity_id UUID NOT NULL, -- ID của dữ liệu bị thay đổi
    action VARCHAR(50) NOT NULL, -- VD: CANCEL_WORKSHOP, REFUND_PAYMENT
    entity_type VARCHAR(50) NOT NULL, -- Tên bảng
    old_payload JSONB,
    new_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.10. CSV_SYNC_LOGS (Lịch sử đồng bộ ban đêm)
CREATE TABLE csv_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    status sync_status_enum NOT NULL DEFAULT 'PROCESSING',
    total_rows INT NOT NULL DEFAULT 0,
    success_rows INT NOT NULL DEFAULT 0,
    error_details JSONB, -- Lưu mảng các dòng lỗi để dò lại
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.11. OUTBOX_EVENTS (Message Broker Resilience)
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_id UUID NOT NULL, -- ID liên quan (Registration_id, Document_id)
    event_type VARCHAR(100) NOT NULL, -- Định dạng theo chuẩn events.md
    payload JSONB NOT NULL,
    status outbox_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.12. NOTIFICATIONS (Thông báo cho User)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel notification_channel_enum NOT NULL DEFAULT 'IN_APP',
    template VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    content TEXT, -- Render sẵn hoặc JSON payload
    recipient VARCHAR(255), -- Email hoặc Device Token
    status notification_status_enum NOT NULL DEFAULT 'PENDING',
    read_at TIMESTAMP WITH TIME ZONE, -- Check xem user đọc in-app chưa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREATE INDEXES (Tối ưu Hiệu năng)
-- =================================================================================
-- FK Indexes (Postgres không tự tạo index cho khóa ngoại)
CREATE INDEX idx_workshops_room_id ON workshops(room_id);
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_registrations_workshop_id ON registrations(workshop_id);
CREATE INDEX idx_checkins_registration_id ON checkins(registration_id);

-- Query Indexes (Tăng tốc các câu query thường xuyên sử dụng)
CREATE INDEX idx_workshops_public_list ON workshops(status, start_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_registrations_status_expires ON registrations(status, expires_at);
CREATE INDEX idx_outbox_events_status ON outbox_events(status);
CREATE INDEX idx_users_active_login ON users(email, is_active);

-- 5. ATTACH TRIGGERS
-- =================================================================================
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_rooms BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_workshops BEFORE UPDATE ON workshops FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_registrations BEFORE UPDATE ON registrations FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_documents BEFORE UPDATE ON documents FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

ALTER TABLE payments ADD COLUMN refund_reason VARCHAR(255);
ALTER TABLE payments ADD COLUMN refund_processed_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient webhook processing
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);