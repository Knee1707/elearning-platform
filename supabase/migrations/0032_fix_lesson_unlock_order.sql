-- =====================================================================
-- 0032_fix_lesson_unlock_order.sql · Sửa fn_is_lesson_unlocked (0020).
-- Lỗi: hàm sắp xếp bài theo lessons.created_at nhưng bảng lessons KHÔNG có cột này
-- → mọi lần gọi với học viên (không phải chủ khóa/admin) đều lỗi
--   "column l.created_at does not exist" → fn_get_lesson_video lỗi → API video trả 500
--   → học viên đã mua vẫn thấy màn "Mua khóa học ngay", không xem được video nào.
-- Sửa: bỏ l.created_at khỏi ORDER BY (thứ tự: vị trí chương → vị trí bài → id).
-- Lỗi 2: học viên chưa có lesson_progress của bài trước → biến NULL → điều kiện
--   `not (NULL or NULL >= 95)` = NULL → IF không chặn → bài sau mở khóa sẵn. Sửa: coalesce.
-- =====================================================================

create or replace function fn_is_lesson_unlocked(p_lesson uuid, p_user uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  v_course_id   uuid;
  v_prev_lesson uuid;
  v_prev_quiz   uuid;
  v_completed   boolean;
  v_percent     integer;
  v_quiz_passed boolean;
begin
  if p_user is null then
    return false;
  end if;

  v_course_id := fn_lesson_course(p_lesson);
  if v_course_id is null then
    return false;
  end if;

  -- Giảng viên quản lý khóa & admin xem được toàn bộ bài học
  if fn_owns_course(v_course_id) or fn_is_admin() then
    return true;
  end if;

  -- Tìm bài học đứng liền trước theo thứ tự chương và bài trong khóa
  with ordered_lessons as (
    select l.id,
           row_number() over (order by ch.position asc, l.position asc, l.id asc) as rn
    from lessons l
    join chapters ch on ch.id = l.chapter_id
    where ch.course_id = v_course_id
  ),
  current_pos as (
    select rn from ordered_lessons where id = p_lesson
  )
  select ol.id into v_prev_lesson
  from ordered_lessons ol, current_pos cp
  where ol.rn = cp.rn - 1;

  -- Nếu không có bài đứng trước => Đây là bài đầu tiên của khóa => Luôn mở khóa!
  if v_prev_lesson is null then
    return true;
  end if;

  -- Lấy tiến độ học bài học đứng liền trước
  select coalesce(is_completed, false), coalesce(watched_percent, 0), coalesce(is_quiz_passed, false)
    into v_completed, v_percent, v_quiz_passed
  from lesson_progress
  where user_id = p_user and lesson_id = v_prev_lesson;
  -- Chưa có dòng tiến độ → SELECT INTO để biến NULL, phải coi là CHƯA học.
  v_completed   := coalesce(v_completed, false);
  v_percent     := coalesce(v_percent, 0);
  v_quiz_passed := coalesce(v_quiz_passed, false);

  -- Điều kiện 1: Video bài trước phải hoàn thành (>= 95% hoặc được đánh dấu hoàn thành)
  if not (v_completed or v_percent >= 95) then
    return false;
  end if;

  -- Điều kiện 2: Nếu bài trước có Quiz thì phải đạt bài Quiz đó
  select id into v_prev_quiz from quizzes where lesson_id = v_prev_lesson limit 1;
  if v_prev_quiz is not null and not v_quiz_passed then
    return false;
  end if;

  return true;
end $$

;
