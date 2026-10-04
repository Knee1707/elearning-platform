-- =====================================================================
-- 0028_course_publish_constraints.sql
-- Thêm ràng buộc khi duyệt xuất bản khóa học (published):
-- - Ít nhất 3 chương.
-- - Ít nhất 5 bài giảng (videos).
-- - Ít nhất 1 bài quiz kiểm tra.
-- - Ít nhất 1 bài test cuối khóa (final exam).
-- =====================================================================

create or replace function fn_moderate_course(p_course uuid, p_status course_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old    course_status;
  v_owner  uuid;
  v_title  text;
  v_reason text := nullif(trim(p_reason), '');
  
  v_chapters_count int;
  v_lessons_count int;
  v_quizzes_count int;
  v_exams_count int;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if p_status in ('rejected', 'hidden') and v_reason is null then
    raise exception 'Cần nhập lý do khi từ chối hoặc ẩn khóa học';
  end if;

  select status, instructor_id, title into v_old, v_owner, v_title from courses where id = p_course for update;
  if not found then raise exception 'Không tìm thấy khóa học'; end if;

  -- Khi duyệt xuất bản khóa học: Kiểm tra các ràng buộc
  if p_status = 'published' then
    -- 1. Ít nhất 3 chương
    select count(*) into v_chapters_count from chapters where course_id = p_course;
    if v_chapters_count < 3 then
      raise exception 'Khóa học phải có ít nhất 3 chương để được xuất bản.';
    end if;
    
    -- 2. Ít nhất 5 bài giảng (lessons/videos)
    select count(*) into v_lessons_count from lessons where chapter_id in (select id from chapters where course_id = p_course);
    if v_lessons_count < 5 then
      raise exception 'Khóa học phải có ít nhất 5 bài giảng (video) để được xuất bản.';
    end if;

    -- 3. Ít nhất 1 quiz (không phải final exam)
    select count(*) into v_quizzes_count from quizzes 
    where (course_id = p_course or lesson_id in (select id from lessons where chapter_id in (select id from chapters where course_id = p_course)))
      and not exists (select 1 from exams where exams.quiz_id = quizzes.id and exams.is_final = true);
      
    if v_quizzes_count < 1 then
      raise exception 'Khóa học phải có ít nhất 1 bài quiz kiểm tra.';
    end if;

    -- 4. Ít nhất 1 final exam
    select count(*) into v_exams_count from exams 
    where is_final = true 
      and quiz_id in (
        select id from quizzes where course_id = p_course or lesson_id in (select id from lessons where chapter_id in (select id from chapters where course_id = p_course))
      );
    if v_exams_count < 1 then
      raise exception 'Khóa học phải có ít nhất 1 bài test cuối khóa (final exam) để nhận chứng chỉ.';
    end if;

    -- Tự động duyệt toàn bộ video và nội dung bài học
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
