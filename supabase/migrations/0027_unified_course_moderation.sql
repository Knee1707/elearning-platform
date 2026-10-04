-- =====================================================================
-- 0027_unified_course_moderation.sql
-- Gộp duyệt khóa học & duyệt video / cập nhật nội dung bài giảng.
-- Quy tắc:
--   1) Thêm cột content_review, content_review_reason, is_updated trên lessons.
--   2) Thêm cột update_status, update_feedback trên courses.
--   3) Hàm fn_review_lesson_content để Admin duyệt hoặc từ chối nội dung bài học.
--      Khi từ chối, bắt buộc có lý do feedback và gửi notification về cho giảng viên.
--   4) Hàm fn_submit_course_update để Giảng viên gửi yêu cầu duyệt khi thay đổi
--      nội dung khóa học hoặc cập nhật bài giảng đã publish.
--   5) Cập nhật fn_moderate_course để khi duyệt xuất bản khóa học, tự động duyệt
--      cả video_review và content_review.
-- =====================================================================

-- 1) Cột kiểm duyệt nội dung trên từng bài học
alter table lessons add column if not exists content_review        text not null default 'approved';
alter table lessons add column if not exists content_review_reason text;
alter table lessons add column if not exists is_updated            boolean not null default false;

-- 2) Cột trạng thái cập nhật trên khóa học
alter table courses add column if not exists update_status         text not null default 'none';
alter table courses add column if not exists update_feedback       text;

-- 3) Hàm duyệt / từ chối nội dung bài học (chỉ admin + super_admin)
create or replace function fn_review_lesson_content(p_lesson uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_reason text := nullif(trim(p_reason), '');
  v_course uuid;
  v_owner  uuid;
  v_title  text;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if not p_approve and v_reason is null then raise exception 'Cần nhập lý do khi từ chối nội dung bài học'; end if;

  select fn_lesson_course(id), title into v_course, v_title from lessons where id = p_lesson;
  if v_course is null then raise exception 'Không tìm thấy bài học'; end if;

  update lessons
     set content_review = case when p_approve then 'approved' else 'rejected' end,
         content_review_reason = case when p_approve then null else v_reason end,
         is_updated = case when p_approve then false else is_updated end
   where id = p_lesson;

  select instructor_id into v_owner from courses where id = v_course;
  if v_owner is not null then
    insert into notification (user_id, type, title, body)
      values (v_owner, 'system',
              case when p_approve then 'Nội dung bài học đã được duyệt' else 'Yêu cầu cập nhật bài học bị từ chối' end,
              '"' || coalesce(v_title, '') || '"' || coalesce(' — Lý do: ' || v_reason, ''));
  end if;

  perform fn_log_activity(case when p_approve then 'approve_lesson_content' else 'reject_lesson_content' end,
                          'lesson', p_lesson, v_reason, jsonb_build_object('course_id', v_course));
end $$;

-- 4) Hàm giảng viên gửi yêu cầu duyệt cập nhật khóa học
create or replace function fn_submit_course_update(p_course uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_title text;
  v_status course_status;
begin
  select instructor_id, title, status into v_owner, v_title, v_status from courses where id = p_course;
  if not found then raise exception 'Không tìm thấy khóa học'; end if;
  if not (fn_owns_course(p_course) or fn_is_admin()) then
    raise exception 'Không có quyền thực hiện';
  end if;

  update courses
     set update_status = 'pending',
         update_feedback = null
   where id = p_course;

  -- Gửi notification cho toàn bộ admin
  insert into notification (user_id, type, title, body)
  select id, 'system', 'Yêu cầu duyệt cập nhật khóa học',
         'Khóa học "' || coalesce(v_title, '') || '" vừa có cập nhật nội dung cần xét duyệt.'
    from profiles
   where role in ('admin', 'super_admin');
end $$;

-- 5) Cập nhật fn_moderate_course để tự động duyệt cả nội dung bài học khi duyệt khóa học
create or replace function fn_moderate_course(p_course uuid, p_status course_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old    course_status;
  v_owner  uuid;
  v_title  text;
  v_reason text := nullif(trim(p_reason), '');
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if p_status in ('rejected', 'hidden') and v_reason is null then
    raise exception 'Cần nhập lý do khi từ chối hoặc ẩn khóa học';
  end if;

  select status, instructor_id, title into v_old, v_owner, v_title from courses where id = p_course for update;
  if not found then raise exception 'Không tìm thấy khóa học'; end if;

  -- Khi duyệt xuất bản khóa học: tự động duyệt toàn bộ video và nội dung bài học
  if p_status = 'published' then
    update lessons
      set video_review = 'approved',
          video_review_reason = null,
          content_review = 'approved',
          content_review_reason = null,
          is_updated = false
      where chapter_id in (select id from chapters where course_id = p_course);

    update courses
      set update_status = 'none',
          update_feedback = null
      where id = p_course;
  end if;

  if v_old = p_status then return; end if;

  update courses
    set status = p_status,
        moderation_note = case when p_status in ('rejected', 'hidden') then v_reason else null end
    where id = p_course;
  perform fn_log_activity('moderate_course', 'course', p_course, v_reason,
                          jsonb_build_object('from', v_old, 'to', p_status));

  if p_status in ('published', 'rejected', 'hidden') then
    insert into notification (user_id, type, title, body)
    values (
      v_owner, 'system',
      case p_status
        when 'published' then 'Khóa học đã được duyệt'
        when 'rejected'  then 'Khóa học bị từ chối'
        else 'Khóa học đã bị ẩn'
      end,
      '"' || v_title || '"' || coalesce(' — Lý do: ' || v_reason, '')
    );
  end if;
end $$;
