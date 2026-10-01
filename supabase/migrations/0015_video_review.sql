-- =====================================================================
-- 0015_video_review.sql  ·  Duyệt video bài giảng
-- Mỗi khi giảng viên đăng/đổi video của 1 bài học → video vào trạng thái
-- CHỜ DUYỆT. Học viên chỉ xem được video đã DUYỆT; chủ khóa & admin xem
-- được mọi trạng thái (để kiểm tra / duyệt). Chạy SAU 0010 (fn_log_activity),
-- 0007 (fn_get_lesson_video), 0002 (lessons, fn_lesson_course...).
-- =====================================================================

-- 1) Cột trạng thái duyệt video trên từng bài học.
--    'none' chưa có video · 'pending' chờ duyệt · 'approved' · 'rejected'
alter table lessons add column if not exists video_review        text not null default 'none';
alter table lessons add column if not exists video_review_reason text;

-- Video đang có sẵn (demo/đã phát được) coi như đã duyệt để không gãy nội dung cũ.
update lessons set video_review = 'approved' where video_url is not null and video_review = 'none';

-- 2) Trigger: hễ video_url đổi (thêm mới hoặc thay) → về 'pending' (hoặc 'none'
--    nếu gỡ video). Hàm duyệt chỉ đổi video_review nên trigger không reset lại.
create or replace function fn_lesson_video_review_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.video_url is distinct from old.video_url then
    new.video_review := case when new.video_url is null then 'none' else 'pending' end;
    new.video_review_reason := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_lesson_video_review on lessons;
create trigger trg_lesson_video_review
  before insert or update on lessons
  for each row execute function fn_lesson_video_review_guard();

-- 3) Hàm duyệt / từ chối video (chỉ admin + super_admin). Báo cho giảng viên + ghi log.
create or replace function fn_review_lesson_video(p_lesson uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_reason text := nullif(trim(p_reason), '');
  v_course uuid;
  v_owner  uuid;
  v_title  text;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if not p_approve and v_reason is null then raise exception 'Cần nhập lý do khi từ chối video'; end if;

  select fn_lesson_course(id), title into v_course, v_title from lessons where id = p_lesson;
  if v_course is null then raise exception 'Không tìm thấy bài học'; end if;

  update lessons
     set video_review = case when p_approve then 'approved' else 'rejected' end,
         video_review_reason = case when p_approve then null else v_reason end
   where id = p_lesson;

  select instructor_id into v_owner from courses where id = v_course;
  if v_owner is not null then
    insert into notification (user_id, type, title, body)
      values (v_owner, 'system',
              case when p_approve then 'Video đã được duyệt' else 'Video bị từ chối' end,
              '"' || coalesce(v_title, '') || '"' || coalesce(' — Lý do: ' || v_reason, ''));
  end if;

  perform fn_log_activity(case when p_approve then 'approve_video' else 'reject_video' end,
                          'lesson', p_lesson, v_reason, jsonb_build_object('course_id', v_course));
end $$;

-- 4) Cổng lấy URL video: thêm điều kiện ĐÃ DUYỆT cho học viên.
create or replace function fn_get_lesson_video(p_lesson uuid)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  v_url    text;
  v_free   boolean;
  v_course uuid;
  v_review text;
begin
  select l.video_url, l.is_free, fn_lesson_course(l.id), l.video_review
    into v_url, v_free, v_course, v_review
  from lessons l
  where l.id = p_lesson;

  if not found then
    return null;
  end if;

  -- Chủ khóa & admin: xem mọi trạng thái (để tự kiểm tra / duyệt).
  if fn_owns_course(v_course) or fn_is_admin() then
    return v_url;
  end if;

  -- Học viên: phải đủ quyền nội dung (free / đã ghi danh) VÀ video đã được duyệt.
  if (v_free or fn_is_enrolled(v_course)) and v_review = 'approved' then
    return v_url;
  end if;
  return null;
end $$;
