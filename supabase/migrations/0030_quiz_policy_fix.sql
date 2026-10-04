-- =====================================================================
-- 0030_quiz_policy_fix.sql · Sửa RLS bảng quizzes cho phép GV tạo quiz.
-- Lỗi: policy cũ (0021) dùng fn_quiz_course(id) — tra lại CHÍNH dòng quiz theo id.
-- Khi INSERT (và RETURNING của .insert().select()), dòng mới chưa nhìn thấy được
-- nên hàm trả NULL → GV bị chặn "new row violates row-level security policy",
-- không tạo được quiz sau bài giảng → không gửi duyệt khóa được.
-- Sửa: tính khóa học trực tiếp từ cột của dòng (course_id hoặc lesson_id).
-- =====================================================================

drop policy if exists quizzes_select on quizzes;
create policy quizzes_select on quizzes
  for select using (fn_course_visible(coalesce(course_id, fn_lesson_course(lesson_id))));

drop policy if exists quizzes_write on quizzes;
create policy quizzes_write on quizzes
  for all using (fn_owns_course(coalesce(course_id, fn_lesson_course(lesson_id))) or fn_is_admin())
          with check (fn_owns_course(coalesce(course_id, fn_lesson_course(lesson_id))) or fn_is_admin());
