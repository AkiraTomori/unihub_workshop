-- =================================================================================
-- MERGED SEED DATA for UniHub Workshop (Canonical)
-- Run after schema init (src/database/init.sql)
-- This single canonical seed file combines earlier samples + user-provided block.
-- Default dev password examples: password123 (bcrypt hash included for some users)
-- =================================================================================

BEGIN;

-- Enable pgcrypto (for crypt/ gen_salt hashing if needed)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------
-- ROOMS
-- -------------------------
INSERT INTO rooms (id, name, map_image_url, base_capacity)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Room A - Building 1', 'https://placehold.co/600x200?text=Room+A', 80),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Room B - Building 2', 'https://placehold.co/600x200?text=Room+B', 40),
  ('11111111-1111-4111-8111-111111111111', 'Hội trường A (Grand Hall)', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80', 500),
  ('22222222-2222-4222-8222-222222222222', 'Phòng Lab 101 - IT', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80', 60),
  ('33333333-3333-4333-8333-333333333333', 'Phòng Hội thảo Nhỏ B2', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', 30)
ON CONFLICT DO NOTHING;

-- -------------------------
-- USERS
-- Note: mixture of DB-generated crypt() hashes and precomputed bcrypt hashes
-- -------------------------
INSERT INTO users (id, student_code, email, password_hash, full_name, role, is_active)
VALUES
  -- earlier admin (DB-generated hash)
  ('11111111-1111-1111-1111-111111111111', NULL, 'admin@unihub.test', crypt('AdminPass!2026', gen_salt('bf', 12)), 'Sys Admin', 'ADMIN', TRUE),
  -- earlier test students
  ('22222222-2222-2222-2222-222222222222', 'S2024001', 'alice@student.unihub.test', crypt('StudentPass!1', gen_salt('bf', 12)), 'Alice Nguyen', 'STUDENT', TRUE),
  ('33333333-3333-3333-3333-333333333333', 'S2024002', 'bob@student.unihub.test', crypt('StudentPass!2', gen_salt('bf', 12)), 'Bob Tran', 'STUDENT', FALSE),
  -- user-provided admin & staff & students (precomputed bcrypt hash = password123)
  ('aaaaa111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NULL, 'admin@unihub.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Ban Tổ Chức', 'ADMIN', TRUE),
  ('bbbbb111-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'STAFF01', 'checker1@unihub.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Nhân sự Cửa A', 'CHECKER', TRUE),
  ('ccccc111-cccc-4ccc-8ccc-cccccccccccc', '21127001', 'huy.thai@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Thái Minh Huy', 'STUDENT', TRUE),
  ('ddddd111-dddd-4ddd-8ddd-dddddddddddd', '21127002', 'tuan.tran@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Trần Anh Tuấn', 'STUDENT', FALSE)
ON CONFLICT DO NOTHING;

-- -------------------------
-- USER SESSIONS
-- -------------------------
INSERT INTO user_sessions (id, user_id, refresh_token, ip_address, is_revoked, expires_at)
VALUES
  ('13131313-1313-1313-1313-131313131313', '11111111-1111-1111-1111-111111111111', 'sample-refresh-token-admin-0001', '127.0.0.1', FALSE, NOW() + INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- -------------------------
-- WORKSHOPS (with speaker)
-- -------------------------
INSERT INTO workshops (id, room_id, title, description, speaker, cover_image_url, start_time, end_time, capacity, registered_count, price, status)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Career Prep: Resume & Interview', 'Practical workshop on resumes and interviews for new graduates.', 'Dr. Linh Tran', 'https://placehold.co/1200x400?text=Career+Prep', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '2 hours', 60, 2, 100.00, 'PUBLISHED'),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Intro to Web Dev', 'Beginner-friendly introduction to building web apps with JavaScript.', 'Hoang Vu', 'https://placehold.co/1200x400?text=Web+Dev', NOW() + INTERVAL '8 days', NOW() + INTERVAL '8 days' + INTERVAL '2 hours', 40, 0, 0.00, 'DRAFT'),
  ('f1111111-f111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'DevOps Thực chiến: Triển khai CI/CD với Docker và Kubernetes', 'Hướng dẫn cấu hình pipeline tự động hóa với Jenkins và ArgoCD. Thực hành triển khai hệ thống Microservices.', 'Nguyen Van A', 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&q=80', '2026-05-15 08:00:00+07', '2026-05-15 11:30:00+07', 60, 1, 50000.00, 'PUBLISHED'),
  ('f2222222-f222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Tối ưu Chi phí Cloud: Thiết kế hệ thống Serverless Zero-Cost', 'Cách sử dụng AWS Lambda, API Gateway và GCP để host các dự án cá nhân, đồ án môn học mà không tốn một đồng chi phí nào.', 'Le Thi B', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80', '2026-05-18 13:00:00+07', '2026-05-18 16:00:00+07', 500, 1, 0.00, 'PUBLISHED'),
  ('f3333333-f333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'Kỹ năng Sư phạm: Lên giáo án chạy nước rút ôn thi Toán vào 10', 'Dành cho các bạn sinh viên đang làm gia sư. Cách thiết kế lộ trình 5 tuần cuối cùng giúp học sinh bứt phá môn Toán.', 'Pham Thi C', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', '2026-05-22 09:00:00+07', '2026-05-22 11:00:00+07', 30, 0, 0.00, 'PUBLISHED'),
  ('f4444444-f444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Phân tích Kịch bản Điện ảnh: Góc nhìn từ Kamen Rider Zero-One', 'Thảo luận về cách xây dựng thế giới AI, mâu thuẫn giữa con người và máy móc thông qua series đình đám.', 'Tran Minh D', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80', '2026-06-05 14:00:00+07', '2026-06-05 16:30:00+07', 30, 0, 0.00, 'DRAFT')
ON CONFLICT DO NOTHING;

-- -------------------------
-- DOCUMENTS
-- -------------------------
INSERT INTO documents (id, workshop_id, pdf_url, ai_summary, process_status)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'https://example.com/docs/resume-guide.pdf', 'Summary: How to craft a strong resume...', 'COMPLETED'),
  -- user-provided doc for DevOps workshop
  (gen_random_uuid(), 'f1111111-f111-4111-8111-111111111111', 'https://cdn.unihub.edu.vn/docs/devops-k8s-guide.pdf', 'Tài liệu hướng dẫn chi tiết các bước thiết lập môi trường Minikube, viết Dockerfile cho ứng dụng Node.js và cấu hình CI/CD tự động bằng ArgoCD.', 'COMPLETED')
ON CONFLICT DO NOTHING;

-- -------------------------
-- REGISTRATIONS
-- -------------------------
INSERT INTO registrations (id, user_id, workshop_id, status, expires_at, qr_code, offline_sync_id)
VALUES
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'CONFIRMED', NULL, 'QR-ALICE-0001', NULL),
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'PENDING_PAYMENT', NOW() + INTERVAL '15 minutes', NULL, 'offline-sync-uuid-0001'),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'CANCELLED', NULL, 'QR-ALICE-0002', NULL),
  -- user-provided registrations
  ('e1111111-e111-4111-8111-111111111111', 'ccccc111-cccc-4ccc-8ccc-cccccccccccc', 'f1111111-f111-4111-8111-111111111111', 'CONFIRMED', NULL, 'UNI-2026-W1-C111', NULL),
  ('e2222222-e222-4222-8222-222222222222', 'ccccc111-cccc-4ccc-8ccc-cccccccccccc', 'f2222222-f222-4222-8222-222222222222', 'CONFIRMED', NULL, 'UNI-2026-W2-C111', NULL)
ON CONFLICT DO NOTHING;

-- -------------------------
-- PAYMENTS
-- -------------------------
INSERT INTO payments (id, registration_id, amount, provider, transaction_id, idempotency_key, status)
VALUES
  ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', 100.00, 'VNPAY', 'TXN-1001', 'idem-1001', 'SUCCESS'),
  ('99999999-9999-9999-9999-999999999999', 'aaaa1111-aaaa-1111-aaaa-111111111111', 100.00, 'VNPAY', 'TXN-1002', 'idem-1002', 'REFUNDED'),
  -- user-provided payment for e1111111-e111-4111-8111-111111111111
  (gen_random_uuid(), 'e1111111-e111-4111-8111-111111111111', 50000.00, 'VNPAY', 'VNPAY-20260504-0001', 'idemp-pay-w1-c111', 'SUCCESS')
ON CONFLICT DO NOTHING;

-- -------------------------
-- CHECKINS
-- -------------------------
INSERT INTO checkins (id, registration_id, device_id, scanned_at, offline_sync_id)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 'device-entrance-01', NOW() - INTERVAL '1 hour', 'watermelon-uuid-0001')
ON CONFLICT DO NOTHING;

-- -------------------------
-- OUTBOX EVENTS
-- -------------------------
INSERT INTO outbox_events (id, aggregate_id, event_type, payload, status)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', 'registration.confirmed', '{"registrationId":"66666666-6666-6666-6666-666666666666"}', 'PENDING')
ON CONFLICT DO NOTHING;

-- -------------------------
-- NOTIFICATIONS
-- -------------------------
INSERT INTO notifications (id, user_id, channel, template, subject, content, recipient, status)
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'EMAIL', 'registration_confirm', 'Your registration is confirmed', 'Dear Alice, your registration is confirmed for Career Prep.', 'alice@student.unihub.test', 'PENDING')
ON CONFLICT DO NOTHING;

-- -------------------------
-- CSV SYNC LOG
-- -------------------------
INSERT INTO csv_sync_logs (id, file_name, status, total_rows, success_rows, error_details)
VALUES
  ('10101010-1010-1010-1010-101010101010', 'students_2026_05_01.csv', 'SUCCESS', 1200, 1198, '[]')
ON CONFLICT DO NOTHING;

-- -------------------------
-- AUDIT LOGS
-- -------------------------
INSERT INTO audit_logs (id, actor_id, entity_id, action, entity_type, old_payload, new_payload)
VALUES
  ('12121212-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'PUBLISH_WORKSHOP', 'workshops', NULL, '{"status":"PUBLISHED"}')
ON CONFLICT DO NOTHING;

-- Developer note: test logins
-- - huy.thai@student.edu.vn / password123
-- - admin@unihub.edu.vn / password123

COMMIT;
