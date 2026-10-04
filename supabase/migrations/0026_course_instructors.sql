-- =====================================================================
-- 0026_course_instructors.sql · Hỗ trợ 1 khóa học có 1 hoặc nhiều giảng viên
-- =====================================================================

create table if not exists course_instructors (
  course_id     uuid        not null references courses (id) on delete cascade,
  instructor_id uuid        not null references profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (course_id, instructor_id)
);

create index if not exists idx_course_instructors_course_id     on course_instructors (course_id);
create index if not exists idx_course_instructors_instructor_id on course_instructors (instructor_id);

-- Tự động đồng bộ các giảng viên chính hiện có từ bảng courses sang course_instructors
insert into course_instructors (course_id, instructor_id)
select id, instructor_id from courses
on conflict do nothing;

-- Bật RLS cho course_instructors
alter table course_instructors enable row level security;

-- Cho phép mọi người đọc thông tin phân công giảng viên
drop policy if exists course_instructors_select on course_instructors;
create policy course_instructors_select on course_instructors
  for select using (true);

-- Admin và Super Admin hoặc chính giảng viên phụ trách có quyền chỉnh sửa phân công
drop policy if exists course_instructors_write_admin on course_instructors;
create policy course_instructors_write_admin on course_instructors
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
    or
    exists (
      select 1 from courses
      where courses.id = course_instructors.course_id and courses.instructor_id = auth.uid()
    )
  );
