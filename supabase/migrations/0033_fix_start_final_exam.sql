-- =====================================================================
-- 0033_fix_start_final_exam.sql · Sửa fn_start_final_exam (0028).
-- Lỗi: hàm RETURNS TABLE(attempt_id, started_at, ...) — tên cột trả về started_at trùng
-- cột exam_attempts.started_at → câu "returning id, started_at" báo
-- "column reference started_at is ambiguous" → học viên KHÔNG bắt đầu được thi cuối khóa
-- (không bao giờ nhận được chứng chỉ). Sửa: ghi rõ tên bảng trong RETURNING.
-- Giữ nguyên điều kiện đề đã được đăng (is_published) của 0028/0029.
-- =====================================================================

create or replace function fn_start_final_exam(p_exam uuid)
returns table (attempt_id uuid, started_at timestamptz, expires_at timestamptz, time_limit_minutes integer)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_course uuid;
  v_minutes integer;
  v_attempt uuid;
  v_started timestamptz;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select e.course_id, e.time_limit_minutes into v_course, v_minutes
  from exams e where e.id = p_exam and e.is_final = true and coalesce(e.is_published, false) = true;
  if v_course is null then raise exception 'Không tìm thấy kỳ thi cuối khóa'; end if;
  if not fn_is_enrolled(v_course) then raise exception 'Bạn chưa ghi danh khóa học này'; end if;
  if exists (
    select 1 from lessons l join chapters ch on ch.id = l.chapter_id
    where ch.course_id = v_course
      and not exists (select 1 from lesson_progress lp where lp.lesson_id = l.id and lp.user_id = v_uid and lp.is_completed)
  ) then raise exception 'Bạn cần hoàn thành toàn bộ nội dung khóa học trước khi thi'; end if;
  if not exists (select 1 from questions q join exams e on e.quiz_id = q.quiz_id where e.id = p_exam) then
    raise exception 'Kỳ thi chưa có câu hỏi';
  end if;

  insert into exam_attempts (exam_id, user_id, status)
  values (p_exam, v_uid, 'in_progress')
  returning exam_attempts.id, exam_attempts.started_at into v_attempt, v_started;
  return query select v_attempt, v_started, v_started + make_interval(mins => v_minutes), v_minutes;
end $$;
