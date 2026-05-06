create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('STUDENT', 'ADMIN', 'CHECKER')),
  password_hash text,
  created_at timestamptz not null default now()
);

alter table app_users add column if not exists password_hash text;

create table if not exists workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  speaker text not null,
  room text not null,
  date_text text not null,
  seats_left int not null,
  total_seats int not null,
  fee int not null default 0,
  status text not null default 'ACTIVE',
  summary_status text not null default 'PENDING',
  summary text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id),
  student_id uuid not null references app_users(id),
  status text not null default 'CONFIRMED',
  qr_code text not null,
  created_at timestamptz not null default now(),
  unique (workshop_id, student_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references registrations(id),
  student_id uuid not null references app_users(id),
  idempotency_key text not null unique,
  amount int not null,
  status text not null default 'SUCCESS',
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id),
  file_name text not null,
  status text not null default 'PENDING',
  ai_summary text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references registrations(id),
  checker_id uuid not null references app_users(id),
  offline_sync_id text not null unique,
  checked_in_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists csv_sync_logs (
  id uuid primary key default gen_random_uuid(),
  processed_rows int not null,
  invalid_rows int not null,
  upsert_conflicts int not null,
  ran_at timestamptz not null default now()
);

create or replace function register_workshop(p_workshop_id uuid, p_student_id uuid)
returns json
language plpgsql
as $$
declare
  current_seats int;
  r registrations%rowtype;
begin
  select seats_left into current_seats from workshops where id = p_workshop_id for update;
  if current_seats is null then
    raise exception 'Workshop not found';
  end if;
  if current_seats <= 0 then
    raise exception 'Workshop sold out';
  end if;

  update workshops
  set seats_left = seats_left - 1
  where id = p_workshop_id;

  insert into registrations(workshop_id, student_id, status, qr_code)
  values (p_workshop_id, p_student_id, 'CONFIRMED', 'QR-' || p_workshop_id || '-' || p_student_id)
  returning * into r;

  return json_build_object(
    'id', r.id,
    'workshop_id', r.workshop_id,
    'student_id', r.student_id,
    'status', r.status,
    'qr_code', r.qr_code
  );
exception
  when unique_violation then
    raise exception 'Student already registered for this workshop';
end;
$$;

create or replace function process_payment(p_registration_id uuid, p_student_id uuid, p_idempotency_key text)
returns json
language plpgsql
as $$
declare
  existing payments%rowtype;
  registration registrations%rowtype;
  workshop workshops%rowtype;
  payment_record payments%rowtype;
begin
  select * into existing from payments where idempotency_key = p_idempotency_key;
  if existing.id is not null then
    return json_build_object('id', existing.id, 'status', existing.status, 'reused', true);
  end if;

  select * into registration from registrations where id = p_registration_id and student_id = p_student_id;
  if registration.id is null then
    raise exception 'Registration not found';
  end if;

  select * into workshop from workshops where id = registration.workshop_id;
  if workshop.id is null then
    raise exception 'Workshop not found';
  end if;

  insert into payments (registration_id, student_id, idempotency_key, amount, status)
  values (registration.id, p_student_id, p_idempotency_key, workshop.fee, 'SUCCESS')
  returning * into payment_record;

  return json_build_object('id', payment_record.id, 'status', payment_record.status, 'reused', false);
end;
$$;

insert into app_users(email, full_name, role, password_hash)
values
  ('student@unihub.local', 'Demo Student', 'STUDENT', '$2a$10$SrxNv2yUqpJ4nOHl37LHp.wjTsWh7IKy02raaOlacW3O5FGU5Oc/q'),
  ('admin@unihub.local', 'Demo Admin', 'ADMIN', '$2a$10$SrxNv2yUqpJ4nOHl37LHp.wjTsWh7IKy02raaOlacW3O5FGU5Oc/q'),
  ('checker@unihub.local', 'Demo Checker', 'CHECKER', '$2a$10$SrxNv2yUqpJ4nOHl37LHp.wjTsWh7IKy02raaOlacW3O5FGU5Oc/q')
on conflict (email) do update
set full_name = excluded.full_name,
    role = excluded.role,
    password_hash = excluded.password_hash;

with workshop_seed(title, speaker, room, date_text, seats_left, total_seats, fee, status, summary_status, summary) as (
  values
    ('Product Management Fundamentals', 'Dr. Linh Tran', 'A-201', '2026-05-12 09:00', 4, 60, 0, 'ACTIVE', 'COMPLETED', 'Product discovery and roadmap communication.'),
    ('Data Storytelling for Internships', 'Hoang Vu', 'B-105', '2026-05-12 13:30', 0, 60, 100000, 'ACTIVE', 'PROCESSING', ''),
    ('Career CV Clinic', 'Anh Nguyen', 'Lab-3', '2026-05-13 10:00', 23, 80, 50000, 'ACTIVE', 'FAILED', ''),
    ('Backend Performance Tuning', 'Minh Le', 'C-302', '2026-05-13 14:00', 38, 60, 0, 'ACTIVE', 'COMPLETED', 'PostgreSQL indexing, query plans, and API caching strategy.'),
    ('Flutter for Campus Apps', 'Tran Bao', 'A-105', '2026-05-14 08:30', 18, 60, 75000, 'ACTIVE', 'COMPLETED', 'Build cross-platform student apps with clean architecture.'),
    ('Cloud Career Roadmap 2026', 'Ngoc Pham', 'B-201', '2026-05-14 10:30', 7, 60, 0, 'ACTIVE', 'PROCESSING', ''),
    ('Technical Interview Deep Dive', 'Khanh Do', 'A-301', '2026-05-14 13:30', 0, 80, 120000, 'ACTIVE', 'COMPLETED', 'Common interview patterns, whiteboard strategy, and communication tips.'),
    ('Data Engineering Foundations', 'Hoang Nam', 'Lab-1', '2026-05-15 09:00', 45, 80, 50000, 'ACTIVE', 'FAILED', ''),
    ('AI Product Design Studio', 'Thu Nguyen', 'Innovation Hub', '2026-05-15 11:00', 12, 40, 150000, 'ACTIVE', 'COMPLETED', 'Design AI-assisted workflows with safety and measurable outcomes.'),
    ('CV & LinkedIn Clinic', 'Anh Nguyen', 'Career Center', '2026-05-15 14:00', 25, 50, 0, 'ACTIVE', 'COMPLETED', 'Optimize CV and LinkedIn profile for internships and junior roles.'),
    ('Cancelled Legacy Integration Session', 'Quang Vu', 'B-001', '2026-05-16 09:30', 60, 60, 0, 'CANCELLED', 'PENDING', ''),
    ('Startup Funding Basics', 'Mai Tran', 'A-401', '2026-05-16 13:00', 31, 60, 90000, 'ACTIVE', 'PROCESSING', '')
)
insert into workshops(title, speaker, room, date_text, seats_left, total_seats, fee, status, summary_status, summary)
select s.title, s.speaker, s.room, s.date_text, s.seats_left, s.total_seats, s.fee, s.status, s.summary_status, s.summary
from workshop_seed s
where not exists (
  select 1
  from workshops w
  where w.title = s.title and w.room = s.room and w.date_text = s.date_text
);

insert into csv_sync_logs(processed_rows, invalid_rows, upsert_conflicts)
values (12430, 41, 93);
