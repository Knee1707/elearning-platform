-- =====================================================================
-- SCRIPT CHẠY TRÊN SUPABASE SQL EDITOR CHO MIGRATION 0019 VÀ 0021
-- Dùng để bổ sung bảng certificate_requests và các cột kỳ thi cuối khóa
-- =====================================================================

-- 1. CẬP NHẬT BẢNG CERTIFICATES (0019)
alter table certificates add column if not exists status text not null default 'approved';
alter table certificates add column if not exists revoked_at timestamptz;
alter table certificates add column if not exists revoked_reason text;

-- Ngừng tự động cấp chứng chỉ tức thì khi nộp bài
drop trigger if exists trg_issue_certificate on exam_attempts;

-- 2. CẬP NHẬT BẢNG QUIZZES & EXAMS CHO KỲ THI CUỐI KHÓA (0021)
alter table quizzes alter column lesson_id drop not null;
alter table quizzes add column if not exists course_id uuid references courses (id) on delete cascade;
alter table quizzes add column if not exists is_final boolean not null default false;

alter table exams add column if not exists quiz_id uuid references quizzes (id) on delete cascade;
alter table exams add column if not exists is_final boolean not null default false;

create unique index if not exists uq_exams_one_final_per_course
  on exams (course_id) where is_final = true;

-- 3. HÀM TẠO BẢNG YÊU CẦU CHỨNG CHỈ NẾU CHƯA CÓ
create table if not exists certificate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  exam_attempt_id uuid references exam_attempts (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles (id),
  rejection_reason text,
  unique (user_id, course_id)
);

create index if not exists idx_certificate_requests_user on certificate_requests (user_id);
create index if not exists idx_certificate_requests_course on certificate_requests (course_id);

-- Bật RLS cho certificate_requests
alter table certificate_requests enable row level security;

drop policy if exists cert_requests_select on certificate_requests;
create policy cert_requests_select on certificate_requests
  for select using (
    user_id = auth.uid()
    or fn_owns_course(course_id)
    or fn_is_admin()
  );

drop policy if exists cert_requests_insert on certificate_requests;
create policy cert_requests_insert on certificate_requests
  for insert with check (
    user_id = auth.uid()
  );

drop policy if exists cert_requests_update on certificate_requests;
create policy cert_requests_update on certificate_requests
  for update using (
    fn_owns_course(course_id) or fn_is_admin()
  );
