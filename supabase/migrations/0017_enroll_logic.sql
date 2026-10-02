-- =====================================================================
-- 0017_enroll_logic.sql  ·  Duyệt học viên vào lớp + GV xem lớp mình
-- Chạy SAU 0016 (enum 'pending' đã commit).
--   · Khóa MIỄN PHÍ: học viên "Xin vào lớp" → 'pending' → GV duyệt → 'active'.
--   · Khóa TRẢ PHÍ: giữ nguyên (mua xong 'active' ngay).
--   · Mở quyền cho GV xem ghi danh / tiến độ / điểm danh / điểm thi của lớp mình.
-- fn_is_enrolled vẫn chỉ tính 'active' nên 'pending' CHƯA được vào học.
-- =====================================================================

-- 1) RLS: giảng viên phụ trách xem được dữ liệu học viên trong khóa của mình.
drop policy if exists enrollments_select_instructor on enrollments;
create policy enrollments_select_instructor on enrollments
  for select using (fn_owns_course(course_id));

drop policy if exists lesson_progress_select_instructor on lesson_progress;
create policy lesson_progress_select_instructor on lesson_progress
  for select using (fn_owns_course(fn_lesson_course(lesson_id)));

drop policy if exists attendance_select_instructor on attendance;
create policy attendance_select_instructor on attendance
  for select using (fn_owns_course(course_id));

drop policy if exists exam_attempts_select_instructor on exam_attempts;
create policy exam_attempts_select_instructor on exam_attempts
  for select using (
    exists (select 1 from exams e where e.id = exam_attempts.exam_id and fn_owns_course(e.course_id))
  );

-- 2) Học viên xin vào lớp khóa MIỄN PHÍ (đã publish). Khóa trả phí → báo lỗi.
create or replace function fn_request_enroll(p_course uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_price    numeric;
  v_status   course_status;
  v_existing enrollment_status;
  v_title    text;
  v_owner    uuid;
begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập'; end if;
  select price, status, title, instructor_id into v_price, v_status, v_title, v_owner
    from courses where id = p_course;
  if not found then raise exception 'Không tìm thấy khóa học'; end if;
  if v_status <> 'published' then raise exception 'Khóa học chưa mở đăng ký'; end if;
  if v_price > 0 then raise exception 'Khóa trả phí — vui lòng mua để vào học'; end if;

  select status into v_existing from enrollments where user_id = auth.uid() and course_id = p_course;
  if v_existing = 'active'  then raise exception 'Bạn đã ở trong lớp này'; end if;
  if v_existing = 'pending' then raise exception 'Yêu cầu của bạn đang chờ giảng viên duyệt'; end if;

  insert into enrollments (user_id, course_id, status)
    values (auth.uid(), p_course, 'pending')
  on conflict (user_id, course_id) do update set status = 'pending';

  insert into notification (user_id, type, title, body)
    values (v_owner, 'system', 'Yêu cầu vào lớp mới',
            'Có học viên xin vào lớp "' || coalesce(v_title, '') || '"');
end $$;

-- 3) Giảng viên (chủ khóa) / admin duyệt hoặc từ chối yêu cầu vào lớp.
create or replace function fn_review_enroll(p_enrollment uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_course uuid; v_user uuid; v_title text;
begin
  select e.course_id, e.user_id into v_course, v_user
    from enrollments e where e.id = p_enrollment and e.status = 'pending';
  if not found then raise exception 'Không tìm thấy yêu cầu đang chờ duyệt'; end if;
  if not (fn_owns_course(v_course) or fn_is_admin()) then
    raise exception 'Chỉ giảng viên phụ trách hoặc admin được duyệt';
  end if;
  select title into v_title from courses where id = v_course;

  if p_approve then
    update enrollments set status = 'active', purchased_at = now() where id = p_enrollment;
    insert into notification (user_id, type, title, body)
      values (v_user, 'system', 'Đã được nhận vào lớp',
              'Bạn đã được duyệt vào lớp "' || coalesce(v_title, '') || '" — vào học ngay!');
  else
    delete from enrollments where id = p_enrollment;
    insert into notification (user_id, type, title, body)
      values (v_user, 'system', 'Yêu cầu vào lớp bị từ chối',
              'Yêu cầu vào lớp "' || coalesce(v_title, '') || '" đã bị từ chối.');
  end if;
end $$;
