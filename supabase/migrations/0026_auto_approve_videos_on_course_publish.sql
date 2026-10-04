-- =====================================================================
-- 0026_auto_approve_videos_on_course_publish.sql
-- Tự động duyệt video bài học khi Admin duyệt xuất bản khóa học.
-- Quy tắc:
--   1) Một khi khóa học được admin duyệt xuất bản ('published'), toàn bộ
--      video hiện có của khóa học đó cũng được coi là đã qua kiểm duyệt
--      (video_review = 'approved') để học viên đã mua có thể học ngay.
--   2) Đối với khóa học đã có sẵn, nếu sau này giảng viên thêm mới hoặc
--      sửa video, trigger trg_lesson_video_review sẽ đưa video đó về
--      'pending' để admin duyệt riêng rẽ.
-- =====================================================================

-- 1) Cập nhật hàm fn_moderate_course để tự động duyệt video khi duyệt khóa học
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

  -- Khi duyệt xuất bản khóa học: tự động duyệt toàn bộ video hiện có của khóa học đó
  -- vì khóa học đã qua bước review tổng thể của admin
  if p_status = 'published' then
    update lessons
      set video_review = 'approved',
          video_review_reason = null
      where chapter_id in (select id from chapters where course_id = p_course)
        and video_url is not null
        and video_review in ('none', 'pending');
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

-- 2) Cập nhật trạng thái video_review cho các khóa học ĐÃ được xuất bản trước đó
-- (để giải phóng ngay cho các khóa học đang bị kẹt video_review = 'pending')
update lessons
  set video_review = 'approved',
      video_review_reason = null
  where video_url is not null
    and video_review in ('none', 'pending')
    and chapter_id in (
      select ch.id from chapters ch
      join courses c on c.id = ch.course_id
      where c.status = 'published'
    );
