-- =====================================================================
-- 0007_secure_paid_content.sql  ·  Chủ: LEADER (L)
-- HOTFIX BẢO MẬT: chặn lấy URL nội dung TRẢ PHÍ khi chưa mua.
-- Áp cho CẢ 3 loại URL nhạy cảm (cùng một lỗ hổng):
--   1. lessons.video_url        (video bài giảng)
--   2. attachments.file_url     (tài liệu PDF/slide)
--   3. live_sessions.meet_url   (link Google Meet)
--
-- Lỗ hổng trước đó: RLS chỉ kiểm khóa 'published' → ai cũng đọc thẳng 3 cột này.
-- Luật đúng: chỉ trả URL khi is_free HOẶC đã ghi danh HOẶC chủ/admin.
-- Cách làm: thu hồi quyền SELECT trên từng cột URL với anon/authenticated,
--           chỉ phát URL qua hàm security definer có kiểm quyền.
-- Chạy sau 0006. LƯU Ý: sau file này KHÔNG `select *` trên 3 bảng trên từ client.
-- =====================================================================


-- ================================================================== --
-- 1) VIDEO — lessons.video_url
-- ================================================================== --
revoke select (video_url) on lessons from anon, authenticated;

create or replace function fn_get_lesson_video(p_lesson uuid)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  v_url    text;
  v_free   boolean;
  v_course uuid;
begin
  select l.video_url, l.is_free, fn_lesson_course(l.id)
    into v_url, v_free, v_course
  from lessons l
  where l.id = p_lesson;

  if not found then
    return null;
  end if;

  if v_free or fn_is_enrolled(v_course) or fn_owns_course(v_course) or fn_is_admin() then
    return v_url;
  end if;
  return null;   -- chưa đủ quyền → app hiện "Mua để xem"
end $$;


-- ================================================================== --
-- 2) TÀI LIỆU — attachments.file_url
-- ================================================================== --
revoke select (file_url) on attachments from anon, authenticated;

create or replace function fn_get_attachment(p_attachment uuid)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  v_url    text;
  v_free   boolean;
  v_course uuid;
begin
  select a.file_url, l.is_free, fn_lesson_course(a.lesson_id)
    into v_url, v_free, v_course
  from attachments a
  join lessons l on l.id = a.lesson_id
  where a.id = p_attachment;

  if not found then
    return null;
  end if;

  if v_free or fn_is_enrolled(v_course) or fn_owns_course(v_course) or fn_is_admin() then
    return v_url;
  end if;
  return null;
end $$;


-- ================================================================== --
-- 3) LIVE — live_sessions.meet_url
-- ================================================================== --
revoke select (meet_url) on live_sessions from anon, authenticated;

-- Học viên vào buổi live: PHẢI đã ghi danh (hoặc chủ/admin) mới ghi điểm danh + trả link.
-- (Override hàm của M2 ở 0005: thêm chốt kiểm ghi danh — trước đó chỉ kiểm đăng nhập.)
create or replace function fn_join_live_session(p_live uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_ls live_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Chưa đăng nhập';
  end if;

  select * into v_ls from live_sessions where id = p_live;
  if not found then
    raise exception 'Không tìm thấy buổi học trực tiếp';
  end if;

  -- CHỐT: chưa ghi danh (và không phải chủ/admin) → chặn.
  if not (fn_is_enrolled(v_ls.course_id) or fn_owns_course(v_ls.course_id) or fn_is_admin()) then
    raise exception 'Cần ghi danh khóa để vào buổi học trực tiếp';
  end if;

  -- Điểm danh trước, trả link sau (gắn chặt điểm danh với việc lấy link).
  insert into attendance (user_id, course_id, source, live_session_id)
  values (auth.uid(), v_ls.course_id, 'live', p_live)
  on conflict do nothing;

  return v_ls.meet_url;
end $$;

-- Chủ khóa / admin xem link Meet để quản lý (KHÔNG ghi điểm danh).
create or replace function fn_get_live_meet(p_live uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select ls.meet_url
  from live_sessions ls
  where ls.id = p_live
    and (fn_owns_course(ls.course_id) or fn_is_admin())
$$;


-- ================================================================== --
-- 4) view_course_detail — dựng lại, BỎ video_url (giữ nguyên cột top-level)
--    App lấy URL video qua fn_get_lesson_video, không qua view nữa.
-- ================================================================== --
create or replace view view_course_detail
with (security_invoker = true) as
select c.id,
       c.instructor_id,
       c.category_id,
       c.title,
       c.slug,
       c.description,
       c.level,
       c.price,
       c.status,
       c.thumbnail_url,
       c.is_featured,
       c.created_at,
       c.updated_at,
       p.full_name as instructor_name,
       coalesce(
         (
           select jsonb_agg(
             jsonb_build_object(
               'id', chapter.id,
               'course_id', chapter.course_id,
               'title', chapter.title,
               'position', chapter.position,
               'lessons', coalesce(
                 (
                   select jsonb_agg(
                     jsonb_build_object(
                       'id', lesson.id,
                       'chapter_id', lesson.chapter_id,
                       'title', lesson.title,
                       -- video_url ĐÃ BỎ (bảo mật) — lấy qua fn_get_lesson_video
                       'video_status', lesson.video_status,
                       'duration_seconds', lesson.duration_seconds,
                       'is_free', lesson.is_free,
                       'position', lesson.position
                     ) order by lesson.position
                   )
                   from lessons lesson
                   where lesson.chapter_id = chapter.id
                 ),
                 '[]'::jsonb
               )
             ) order by chapter.position
           )
           from chapters chapter
           where chapter.course_id = c.id
         ),
         '[]'::jsonb
       ) as chapters
from courses c
join profiles p on p.id = c.instructor_id
where c.status = 'published';
