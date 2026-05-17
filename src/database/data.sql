BEGIN;

-- Enable pgcrypto (for crypt/ gen_salt hashing if needed)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO rooms (id, name, map_image_url, base_capacity)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Room A - Building 1', 'https://placehold.co/600x200?text=Room+A', 80),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Room B - Building 2', 'https://placehold.co/600x200?text=Room+B', 40),
  ('11111111-1111-4111-8111-111111111111', 'Hội trường A (Grand Hall)', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80', 500),
  ('22222222-2222-4222-8222-222222222222', 'Phòng Lab 101 - IT', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80', 60),
  ('33333333-3333-4333-8333-333333333333', 'Phòng Hội thảo Nhỏ B2', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', 30),
  ('c1111111-c111-4111-8111-111111111111', 'Phòng Lab MAC 201', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80', 40),
  ('c2222222-c222-4222-8222-222222222222', 'Sân khấu ngoài trời', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80', 1000),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b01', 'Phòng Khởi nghiệp (Startup Room)', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', 50),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b02', 'Studio Nhiếp ảnh', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80', 30),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b03', 'Phòng Lab AI & IoT', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80', 45),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b04', 'Thư viện Trung tâm - Khu tự học', 'https://images.unsplash.com/photo-1505664187598-a28a2a4bdfa5?w=800&q=80', 120),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b05', 'Hội trường B (Khu C)', 'https://images.unsplash.com/photo-1478147424043-1621217e997f?w=800&q=80', 300),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b06', 'Phòng họp VIP 01', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80', 20),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b07', 'Khuôn viên bãi cỏ (Outdoor)', 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&q=80', 500),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b08', 'Sân vận động Trường', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80', 2000),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b09', 'Phòng Âm nhạc & Nghệ thuật', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80', 60),
  ('2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b10', 'Phòng Thực hành Hóa Sinh', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80', 40)
ON CONFLICT DO NOTHING;


INSERT INTO users (id, student_code, email, password_hash, full_name, role, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', NULL, 'admin@unihub.test', crypt('AdminPass!2026', gen_salt('bf', 12)), 'Sys Admin', 'ADMIN', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'S2024001', 'alice@student.unihub.test', crypt('StudentPass!1', gen_salt('bf', 12)), 'Alice Nguyen', 'STUDENT', TRUE),
  ('33333333-3333-3333-3333-333333333333', 'S2024002', 'bob@student.unihub.test', crypt('StudentPass!2', gen_salt('bf', 12)), 'Bob Tran', 'STUDENT', FALSE),
  ('aaaaa111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NULL, 'admin@unihub.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Ban Tổ Chức', 'ADMIN', TRUE),
  ('bbbbb111-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'STAFF01', 'checker1@unihub.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Nhân sự Cửa A', 'CHECKER', TRUE),
  ('ccccc111-cccc-4ccc-8ccc-cccccccccccc', '21127001', 'huy.thai@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Thái Minh Huy', 'STUDENT', TRUE),
  ('ddddd111-dddd-4ddd-8ddd-dddddddddddd', '21127002', 'tuan.tran@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Trần Anh Tuấn', 'STUDENT', FALSE),
  ('d1111111-d111-4111-8111-111111111111', '21127003', 'ha.le@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Lê Thu Hà', 'STUDENT', TRUE),
  ('d2222222-d222-4222-8222-222222222222', '21127004', 'minh.pham@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Phạm Quang Minh', 'STUDENT', TRUE),
  ('d3333333-d333-4333-8333-333333333333', '21127005', 'khoa.nguyen@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Nguyễn Đăng Khoa', 'STUDENT', TRUE),
  ('d4444444-d444-4444-8444-444444444444', '21127006', 'vy.tran@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Trần Thảo Vy', 'STUDENT', TRUE),
  ('d5555555-d555-4555-8555-555555555555', '21127007', 'phong.vo@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Võ Thanh Phong', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a01', '23202401', 'sv01@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Nguyễn Văn Một', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a02', '23202402', 'sv02@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Trần Thị Hai', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a03', '23202403', 'sv03@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Lê Văn Ba', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a04', '23202404', 'sv04@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Phạm Thị Bốn', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a05', '23202405', 'sv05@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Hoàng Văn Năm', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a06', '23202406', 'sv06@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Vũ Thị Sáu', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a07', '23202407', 'sv07@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Đặng Văn Bảy', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a08', '23202408', 'sv08@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Bùi Thị Tám', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a09', '23202409', 'sv09@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Đỗ Văn Chín', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a10', '23202410', 'sv10@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Hồ Thị Mười', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a11', '23202411', 'sv11@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Ngô Văn Mười Một', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a12', '23202412', 'sv12@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Dương Thị Mười Hai', 'STUDENT', FALSE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a13', '23202413', 'sv13@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Lý Văn Mười Ba', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a14', '23202414', 'sv14@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Đào Thị Mười Bốn', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a15', '23202415', 'sv15@student.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Đoàn Văn Mười Lăm', 'STUDENT', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a16', 'STAFF02', 'checker2@unihub.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Nhân sự Cửa B', 'CHECKER', TRUE),
  ('1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a17', 'STAFF03', 'checker3@unihub.edu.vn', '$2b$12$fBpdUjhyplAM6z9MXiummOxaiDrwVB3ZboFSbKFL8UmKimHEgFz3W', 'Nhân sự Cửa C', 'CHECKER', TRUE)
ON CONFLICT DO NOTHING;


INSERT INTO user_sessions (id, user_id, refresh_token, ip_address, is_revoked, expires_at)
VALUES
  ('13131313-1313-1313-1313-131313131313', '11111111-1111-1111-1111-111111111111', 'sample-refresh-token-admin-0001', '127.0.0.1', FALSE, NOW() + INTERVAL '30 days')
ON CONFLICT DO NOTHING;


INSERT INTO workshops (id, room_id, title, description, speaker, cover_image_url, start_time, end_time, capacity, registered_count, price, status)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Career Prep: Resume & Interview', 'Practical workshop on resumes and interviews for new graduates.', 'Dr. Linh Tran', 'https://placehold.co/1200x400?text=Career+Prep', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '2 hours', 60, 2, 100.00, 'PUBLISHED'),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Intro to Web Dev', 'Beginner-friendly introduction to building web apps with JavaScript.', 'Hoang Vu', 'https://placehold.co/1200x400?text=Web+Dev', NOW() + INTERVAL '8 days', NOW() + INTERVAL '8 days' + INTERVAL '2 hours', 40, 0, 0.00, 'DRAFT'),
  ('f1111111-f111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'DevOps Thực chiến: Triển khai CI/CD với Docker và Kubernetes', 'Hướng dẫn cấu hình pipeline tự động hóa với Jenkins và ArgoCD.', 'Nguyen Van A', 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&q=80', '2026-05-15 08:00:00+07', '2026-05-15 11:30:00+07', 60, 1, 50000.00, 'PUBLISHED'),
  ('f2222222-f222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Tối ưu Chi phí Cloud: Thiết kế hệ thống Serverless Zero-Cost', 'Cách sử dụng AWS Lambda, API Gateway và GCP để host.', 'Le Thi B', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80', '2026-05-18 13:00:00+07', '2026-05-18 16:00:00+07', 500, 1, 0.00, 'PUBLISHED'),
  ('f3333333-f333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'Kỹ năng Sư phạm: Lên giáo án chạy nước rút ôn thi Toán vào 10', 'Dành cho các bạn sinh viên đang làm gia sư.', 'Pham Thi C', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', '2026-05-22 09:00:00+07', '2026-05-22 11:00:00+07', 30, 0, 0.00, 'PUBLISHED'),
  ('f4444444-f444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Phân tích Kịch bản Điện ảnh: Góc nhìn từ Kamen Rider Zero-One', 'Thảo luận về cách xây dựng thế giới AI.', 'Tran Minh D', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80', '2026-06-05 14:00:00+07', '2026-06-05 16:30:00+07', 30, 0, 0.00, 'DRAFT'),
  ('f5555555-f555-4555-8555-555555555555', 'c1111111-c111-4111-8111-111111111111', 'Mastering UI/UX Design trong 120 phút', 'Quy trình thực chiến từ Wireframe đến Prototype bằng Figma.', 'Đỗ Văn E', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '3 hours', 40, 2, 0.00, 'PUBLISHED'),
  ('f6666666-f666-4666-8666-666666666666', 'c2222222-c222-4222-8222-222222222222', 'Đêm Gala: Gen Z và Khát vọng khởi nghiệp', 'Buổi chia sẻ từ các Start-up Unicorn Việt Nam.', 'Shark Bình', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80', NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days' + INTERVAL '4 hours', 1000, 3, 150000.00, 'PUBLISHED'),
  ('f7777777-f777-4777-8777-777777777777', '11111111-1111-4111-8111-111111111111', 'Workshop bị hủy: Blockchain & Web3', 'Sự kiện đã bị hủy do diễn giả có việc đột xuất.', 'Alex Nguyễn', 'https://images.unsplash.com/photo-1639762681485-074b7f4ec674?w=800&q=80', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '2 hours', 200, 1, 50000.00, 'CANCELLED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c01', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b03', 'Mastering ChatGPT API cho Developer', 'Học cách tích hợp LLM vào ứng dụng Node.js.', 'AI Expert', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 3 hours', 45, 10, 99000.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c02', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b01', 'Pitching Đầu tư: Nói sao cho Shark gật đầu?', 'Kỹ năng thuyết trình gọi vốn dành cho Startup.', 'Shark Assistant', 'https://images.unsplash.com/photo-1556761175-5973dc0f32d7?w=800&q=80', NOW() + INTERVAL '12 days', NOW() + INTERVAL '12 days 2 hours', 50, 5, 0.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c03', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b02', 'Workshop Nhiếp ảnh Mùa Hè', 'Bố cục, ánh sáng và màu sắc trong nhiếp ảnh đường phố.', 'Photographer Pro', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80', NOW() + INTERVAL '15 days', NOW() + INTERVAL '15 days 4 hours', 30, 0, 150000.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c04', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b04', 'IELTS 7.5 Speaking Masterclass', 'Luyện tập Speaking trực tiếp với cựu giám khảo.', 'Mr. John Doe', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80', NOW() + INTERVAL '20 days', NOW() + INTERVAL '20 days 2 hours', 120, 0, 50000.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c05', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b05', 'Hội thảo: Tương lai của Tiền điện tử (Crypto)', 'Sự thật đằng sau Bitcoin và Web3.', 'Crypto Bro', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&q=80', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '3 hours', 300, 150, 0.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c06', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b08', 'Đại nhạc hội Chào Tân Sinh Viên 2025', 'Sự kiện âm nhạc bùng nổ quy mô toàn trường.', 'Ban Chấp hành Đoàn', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '5 hours', 2000, 1950, 100000.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c07', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b09', 'Guitar Acoustic Căn bản', 'Giao lưu học hỏi kỹ năng đệm hát guitar.', 'CLB Guitar', 'https://images.unsplash.com/photo-1525201548942-d8732f51c7f1?w=800&q=80', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '2 hours', 60, 60, 20000.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c08', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b10', '[Bản nháp] Thực hành chiết xuất DNA', 'Sự kiện nội bộ của khoa Hóa Sinh.', 'Giảng viên Khoa', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80', NOW() + INTERVAL '25 days', NOW() + INTERVAL '25 days 3 hours', 40, 0, 0.00, 'DRAFT'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c09', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b06', '[Bản nháp] Lễ trao học bổng Doanh nghiệp', 'Sắp xếp danh sách sinh viên.', 'Phòng CTSV', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80', NOW() + INTERVAL '40 days', NOW() + INTERVAL '40 days 2 hours', 20, 0, 0.00, 'DRAFT'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c10', '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b07', 'Giải chạy từ thiện Marathon 2026', 'Sự kiện chạy bộ quanh trường.', 'CLB Thể thao', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 4 hours', 500, 0, 50000.00, 'CANCELLED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Phân tích Dữ liệu với Python', 'Sử dụng Pandas và Matplotlib.', 'Data Scientist', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', NOW() + INTERVAL '6 days', NOW() + INTERVAL '6 days 3 hours', 80, 0, 0.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c12', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Thiết kế Logo với Illustrator', 'Học cách tạo logo.', 'Designer', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80', NOW() + INTERVAL '9 days', NOW() + INTERVAL '9 days 2 hours', 40, 0, 100000.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c13', '11111111-1111-4111-8111-111111111111', 'Tâm lý học trong Marketing', 'Tại sao khách hàng chốt đơn?', 'Marketer', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80', NOW() + INTERVAL '11 days', NOW() + INTERVAL '11 days 3 hours', 500, 0, 0.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c14', '22222222-2222-4222-8222-222222222222', 'Bảo mật Ứng dụng Web', 'Phát hiện lỗ hổng XSS.', 'Hacker', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days 4 hours', 60, 0, 200000.00, 'PUBLISHED'),
  ('3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c15', '33333333-3333-4333-8333-333333333333', 'Kỹ năng Quản lý Thời gian', 'Phương pháp Pomodoro.', 'Coach', 'https://images.unsplash.com/photo-1506784951206-b962773491f5?w=800&q=80', NOW() + INTERVAL '16 days', NOW() + INTERVAL '16 days 2 hours', 30, 0, 0.00, 'PUBLISHED')
ON CONFLICT DO NOTHING;

INSERT INTO documents (id, workshop_id, pdf_url, ai_summary, process_status)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'https://example.com/docs/resume-guide.pdf', 'Summary: How to craft a strong resume...', 'COMPLETED'),
  (gen_random_uuid(), 'f1111111-f111-4111-8111-111111111111', 'https://cdn.unihub.edu.vn/docs/devops-k8s-guide.pdf', 'Tài liệu hướng dẫn chi tiết các bước thiết lập môi trường.', 'COMPLETED'),
  (gen_random_uuid(), 'f5555555-f555-4555-8555-555555555555', 'https://cdn.unihub.edu.vn/docs/ui-ux.pdf', NULL, 'PROCESSING'),
  (gen_random_uuid(), 'f6666666-f666-4666-8666-666666666666', 'https://cdn.unihub.edu.vn/docs/startup.pdf', NULL, 'FAILED'),
  (gen_random_uuid(), 'f2222222-f222-4222-8222-222222222222', 'https://cdn.unihub.edu.vn/docs/cloud.pdf', NULL, 'PENDING')
ON CONFLICT DO NOTHING;


INSERT INTO registrations (id, user_id, workshop_id, status, expires_at, qr_code, offline_sync_id)
VALUES 
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'CONFIRMED', NULL, 'QR-ALICE-0001', NULL),
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'PENDING_PAYMENT', NOW() + INTERVAL '15 minutes', NULL, 'offline-sync-uuid-0001'),
  ('aaaa1111-aaaa-1111-aaaa-111111111111', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'CANCELLED', NULL, 'QR-ALICE-0002', NULL),
  ('e1111111-e111-4111-8111-111111111111', 'ccccc111-cccc-4ccc-8ccc-cccccccccccc', 'f1111111-f111-4111-8111-111111111111', 'CONFIRMED', NULL, 'UNI-2026-DEVOPS-HUY', NULL),
  ('e2222222-e222-4222-8222-222222222222', 'ccccc111-cccc-4ccc-8ccc-cccccccccccc', 'f2222222-f222-4222-8222-222222222222', 'CONFIRMED', NULL, 'UNI-2026-CLOUD-HUY', NULL),
  ('e3333333-e333-4333-8333-333333333333', 'd1111111-d111-4111-8111-111111111111', 'f5555555-f555-4555-8555-555555555555', 'CONFIRMED', NULL, 'UNI-2026-UIUX-HA', NULL),
  ('e4444444-e444-4444-8444-444444444444', 'd2222222-d222-4222-8222-222222222222', 'f5555555-f555-4555-8555-555555555555', 'CONFIRMED', NULL, 'UNI-2026-UIUX-MINH', NULL),
  ('e5555555-e555-4555-8555-555555555555', 'd3333333-d333-4333-8333-333333333333', 'f6666666-f666-4666-8666-666666666666', 'PENDING_PAYMENT', NOW() - INTERVAL '30 minutes', NULL, 'offline-sync-uuid-0002'),
  ('e6666666-e666-4666-8666-666666666666', 'd4444444-d444-4444-8444-444444444444', 'f6666666-f666-4666-8666-666666666666', 'CONFIRMED', NULL, 'UNI-2026-GALA-VY', NULL),
  ('e7777777-e777-4777-8777-777777777777', 'd5555555-d555-4555-8555-555555555555', 'f6666666-f666-4666-8666-666666666666', 'CONFIRMED', NULL, 'UNI-2026-GALA-PHONG', NULL),
  ('e8888888-e888-4888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'f7777777-f777-4777-8777-777777777777', 'CANCELLED', NULL, 'UNI-2026-BLOCK-ALICE', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO payments (id, registration_id, amount, provider, transaction_id, idempotency_key, status)
VALUES 
  ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', 100.00, 'VNPAY', 'TXN-1001', 'idem-1001', 'SUCCESS'),
  ('99999999-9999-9999-9999-999999999999', 'aaaa1111-aaaa-1111-aaaa-111111111111', 100.00, 'VNPAY', 'TXN-1002', 'idem-1002', 'REFUNDED'),
  (gen_random_uuid(), 'e1111111-e111-4111-8111-111111111111', 50000.00, 'VNPAY', 'VNPAY-20260504-0001', 'idemp-pay-devops-huy', 'SUCCESS'),
  (gen_random_uuid(), 'e5555555-e555-4555-8555-555555555555', 150000.00, 'MOMO', NULL, 'idemp-pay-gala-khoa', 'FAILED'),
  (gen_random_uuid(), 'e6666666-e666-4666-8666-666666666666', 150000.00, 'MOMO', 'MOMO-20260505-001', 'idemp-pay-gala-vy', 'SUCCESS'),
  (gen_random_uuid(), 'e7777777-e777-4777-8777-777777777777', 150000.00, 'VNPAY', 'VNPAY-20260505-002', 'idemp-pay-gala-phong', 'SUCCESS'),
  (gen_random_uuid(), 'e8888888-e888-4888-8888-888888888888', 50000.00, 'VNPAY', 'VNPAY-REFUND-001', 'idemp-pay-block-alice', 'REFUNDED')
ON CONFLICT DO NOTHING;

INSERT INTO registrations (id, user_id, workshop_id, status, qr_code)
SELECT gen_random_uuid(), id, '3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c01', 'CONFIRMED', 'QR-CHATGPT-' || SUBSTRING(id::text, 1, 8)
FROM users WHERE email IN ('sv01@student.edu.vn', 'sv02@student.edu.vn', 'sv03@student.edu.vn', 'sv04@student.edu.vn', 'sv05@student.edu.vn')
ON CONFLICT DO NOTHING;

INSERT INTO payments (id, registration_id, amount, provider, transaction_id, idempotency_key, status)
SELECT gen_random_uuid(), r.id, 99000.00, 'VNPAY', 'VN-CHATGPT-' || SUBSTRING(r.id::text, 1, 6), 'idem-gpt-' || r.id, 'SUCCESS'
FROM registrations r WHERE workshop_id = '3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c01' AND status = 'CONFIRMED'
ON CONFLICT DO NOTHING;

INSERT INTO registrations (id, user_id, workshop_id, status, expires_at, qr_code)
SELECT gen_random_uuid(), id, '3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c01', 'PENDING_PAYMENT', NOW() + INTERVAL '10 minutes', 'QR-PENDING-' || SUBSTRING(id::text, 1, 8)
FROM users WHERE email IN ('sv06@student.edu.vn', 'sv07@student.edu.vn', 'sv08@student.edu.vn')
ON CONFLICT DO NOTHING;

INSERT INTO registrations (id, user_id, workshop_id, status, qr_code)
SELECT gen_random_uuid(), id, '3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c02', 'CONFIRMED', 'QR-PITCH-' || SUBSTRING(id::text, 1, 8)
FROM users WHERE email IN ('sv01@student.edu.vn', 'sv05@student.edu.vn', 'sv09@student.edu.vn', 'sv10@student.edu.vn', 'sv11@student.edu.vn')
ON CONFLICT DO NOTHING;

INSERT INTO checkins (id, registration_id, device_id, scanned_at, offline_sync_id)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 'device-entrance-01', NOW() - INTERVAL '1 hour', 'watermelon-uuid-0001'),
  (gen_random_uuid(), 'e6666666-e666-4666-8666-666666666666', 'device-entrance-gala-01', NOW() - INTERVAL '1 days' - INTERVAL '5 minutes', 'watermelon-uuid-0002'),
  (gen_random_uuid(), 'e7777777-e777-4777-8777-777777777777', 'device-entrance-gala-02', NOW() - INTERVAL '1 days', 'watermelon-uuid-0003')
ON CONFLICT DO NOTHING;

INSERT INTO checkins (id, registration_id, device_id, scanned_at, offline_sync_id)
SELECT gen_random_uuid(), id, 'gate-scanner-A', NOW() - INTERVAL '30 days', 'sync-music-' || SUBSTRING(id::text, 1, 8)
FROM registrations WHERE workshop_id = '3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c06' LIMIT 10
ON CONFLICT DO NOTHING;


INSERT INTO outbox_events (id, aggregate_id, event_type, payload, status)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', 'registration.confirmed', '{"registrationId":"66666666-6666-6666-6666-666666666666"}', 'PENDING'),
  (gen_random_uuid(), 'e1111111-e111-4111-8111-111111111111', 'registration.confirmed', '{"registrationId":"e1111111-e111-4111-8111-111111111111"}', 'PUBLISHED')
ON CONFLICT DO NOTHING;


INSERT INTO notifications (id, user_id, channel, template, subject, content, recipient, status)
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'EMAIL', 'registration_confirm', 'Your registration is confirmed', 'Dear Alice, your registration is confirmed.', 'alice@student.unihub.test', 'PENDING'),
  (gen_random_uuid(), 'ccccc111-cccc-4ccc-8ccc-cccccccccccc', 'EMAIL', 'registration_confirm', 'Xác nhận vé: DevOps Thực chiến', 'Chào bạn, vé của bạn đã được xác nhận.', 'huy.thai@student.edu.vn', 'SENT')
ON CONFLICT DO NOTHING;


INSERT INTO csv_sync_logs (id, file_name, status, total_rows, success_rows, error_details)
VALUES
  ('10101010-1010-1010-1010-101010101010', 'students_2026_05_01.csv', 'SUCCESS', 1200, 1198, '[{"row": 50, "error": "Invalid email"}, {"row": 150, "error": "Missing student code"}]')
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (id, actor_id, entity_id, action, entity_type, old_payload, new_payload)
VALUES
  ('12121212-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'PUBLISH_WORKSHOP', 'workshops', NULL, '{"status":"PUBLISHED"}'),
  (gen_random_uuid(), 'aaaaa111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'f7777777-f777-4777-8777-777777777777', 'CANCEL_WORKSHOP', 'workshops', '{"status":"PUBLISHED"}', '{"status":"CANCELLED"}')
ON CONFLICT DO NOTHING;

INSERT INTO workshops (
  id, room_id, title, description, speaker, cover_image_url, 
  start_time, end_time, capacity, registered_count, price, status
)
VALUES (
  '99999999-9999-9999-9999-999999999999', 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
  '🔥 [DEMO] Sự kiện Flash Sale - Tranh chấp vé', 
  'Sự kiện này chỉ có đúng 2 vé để demo tính năng chống Overselling bằng Redis.', 
  'Admin', 
  'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800&q=80', 
  NOW() + INTERVAL '1 days', 
  NOW() + INTERVAL '1 days' + INTERVAL '2 hours', 
  2,
  0, 
  0.00, 
  'PUBLISHED'
)
ON CONFLICT DO NOTHING;

COMMIT;