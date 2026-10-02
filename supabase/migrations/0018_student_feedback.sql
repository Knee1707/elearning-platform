-- =====================================================================
-- 0018_student_feedback.sql  ·  Giảng viên gửi nhận xét quá trình học
-- GV gửi nhận xét/đánh giá quá trình học cho từng học viên trong lớp mình.
-- Học viên xem được nhận xét dành cho mình. Chạy SAU 0017 (enrollments).
-- =====================================================================

create table if not exists student_feedback (
  id            uuid        primary key default gen_random_uuid(),
  course_id     uuid        not null references courses (id) on delete cascade,
  student_id    uuid        not null references profiles (id) on delete cascade,
  instructor_id uuid        not null references profiles (id) on delete cascade,
  content       text        not null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_student_feedback_student on student_feedback (student_id);
create index if not exists idx_student_feedback_course  on student_feedback (course_id);

alter table student_feedback enable row level security;

-- Đọc: học viên nhận, giảng viên gửi, hoặc admin. Ghi chỉ qua hàm definer bên dưới.
drop policy if exists student_feedback_select on student_feedback;
create policy student_feedback_select on student_feedback
  for select using (student_id = auth.uid() or instructor_id = auth.uid() or fn_is_admin());

-- GV (chủ khóa) gửi nhận xét cho học viên ĐANG HỌC khóa đó; báo cho học viên.
create or replace function fn_send_feedback(p_course uuid, p_student uuid, p_content text)
returns void language plpgsql security definer set search_path = public as $$
declare v_content text := nullif(trim(p_content), ''); v_title text;
begin
  if not (fn_owns_course(p_course) or fn_is_admin()) then raise exception 'Chỉ giảng viên phụ trách'; end if;
  if v_content is null then raise exception 'Nội dung nhận xét không được để trống'; end if;
  if not exists (select 1 from enrollments where course_id = p_course and user_id = p_student and status = 'active') then
    raise exception 'Học viên không thuộc lớp này';
  end if;

  insert into student_feedback (course_id, student_id, instructor_id, content)
    values (p_course, p_student, auth.uid(), v_content);

  select title into v_title from courses where id = p_course;
  insert into notification (user_id, type, title, body)
    values (p_student, 'system', 'Nhận xét mới từ giảng viên',
            'Khóa "' || coalesce(v_title, '') || '": ' || left(v_content, 140));
end $$;
