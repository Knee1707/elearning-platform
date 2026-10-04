-- =====================================================================
-- 0031_course_co_instructor_edit.sql · Mọi giảng viên được phân công đều soạn được khóa.
-- Trước đây fn_owns_course / fn_course_visible / RLS courses chỉ nhận courses.instructor_id
-- (giảng viên chính) → giảng viên đồng phụ trách (course_instructors, 0026) thấy khóa trong
-- Studio nhưng bị chặn khi xem bản nháp, thêm chương/bài/quiz/thi và gửi duyệt.
-- Xóa khóa vẫn chỉ dành cho giảng viên chính (courses_delete_owner giữ nguyên).
-- =====================================================================

create or replace function fn_owns_course(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from courses c where c.id = cid and c.instructor_id = auth.uid())
      or exists (select 1 from course_instructors ci where ci.course_id = cid and ci.instructor_id = auth.uid())
$$;

create or replace function fn_course_visible(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from courses c where c.id = cid and c.status = 'published')
      or fn_owns_course(cid)
      or fn_is_admin()
$$;

drop policy if exists courses_select_visible on courses;
create policy courses_select_visible on courses
  for select using (status = 'published' or fn_owns_course(id) or fn_is_admin());

drop policy if exists courses_update_owner on courses;
create policy courses_update_owner on courses
  for update using (fn_owns_course(id) or fn_is_admin())
             with check (fn_owns_course(id) or fn_is_admin());
