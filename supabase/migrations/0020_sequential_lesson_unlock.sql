-- =====================================================================
-- 0020_sequential_lesson_unlock.sql  ·  Mở khóa bài học tuần tự
-- Quy tắc: Trong 1 khóa học, video đầu tiên luôn mở khóa. Video tiếp theo
-- chỉ được mở khóa khi học viên:
--   1) Xem hết video bài trước (watched_percent >= 95 hoặc is_completed = true).
--   2) Vượt qua bài quiz của bài trước (nếu có quiz, điểm >= pass_score).
-- Chạy SAU 0015 (fn_get_lesson_video), 0003 (quizzes, lesson_progress).
-- =====================================================================

-- 1) Bổ sung cột theo dõi kết quả Quiz theo bài học vào lesson_progress
alter table lesson_progress
  add column if not exists quiz_score integer check (quiz_score is null or (quiz_score between 0 and 100)),
  add column if not exists is_quiz_passed boolean not null default false;

-- 2) Hàm nộp và chấm điểm Quiz bài học (bảo mật, chấm khép kín phía DB)
create or replace function fn_submit_quiz(p_quiz uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_lesson_id   uuid;
  v_course_id   uuid;
  v_pass_score  integer;
  v_total       integer := 0;
  v_correct     integer := 0;
  v_score       integer := 0;
  v_passed      boolean := false;
  v_q           uuid;
  v_opt         uuid;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập';
  end if;

  select qz.lesson_id, qz.pass_score, fn_lesson_course(qz.lesson_id)
    into v_lesson_id, v_pass_score, v_course_id
  from quizzes qz
  where qz.id = p_quiz;

  if v_lesson_id is null then
    raise exception 'Không tìm thấy bài quiz';
  end if;

  if not (fn_is_enrolled(v_course_id) or fn_owns_course(v_course_id) or fn_is_admin()) then
    raise exception 'Chưa ghi danh khóa học này';
  end if;

  -- Duyệt câu trả lời và so khớp đáp án đúng từ bảng options
  for v_q, v_opt in
    select key::uuid, value::text::uuid
    from jsonb_each_text(p_answers)
  loop
    v_total := v_total + 1;
    if exists (
      select 1 from options o
      where o.id = v_opt and o.question_id = v_q and o.is_correct = true
    ) then
      v_correct := v_correct + 1;
    end if;
  end loop;

  if v_total > 0 then
    v_score := round(v_correct::numeric / v_total * 100);
  end if;

  v_passed := (v_score >= coalesce(v_pass_score, 0));

  -- Cập nhật tiến độ học tập (giữ mốc điểm cao nhất và cờ đã pass)
  insert into lesson_progress (user_id, lesson_id, quiz_score, is_quiz_passed)
  values (v_uid, v_lesson_id, v_score, v_passed)
  on conflict (user_id, lesson_id) do update set
    quiz_score = greatest(coalesce(lesson_progress.quiz_score, 0), excluded.quiz_score),
    is_quiz_passed = (lesson_progress.is_quiz_passed or excluded.is_quiz_passed),
    updated_at = now();

  return jsonb_build_object(
    'score', v_score,
    'pass_score', v_pass_score,
    'passed', v_passed,
    'lesson_id', v_lesson_id
  );
end $$;

-- 3) Hàm kiểm tra bài học đã được mở khóa hay chưa
create or replace function fn_is_lesson_unlocked(p_lesson uuid, p_user uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
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
           row_number() over (order by ch.position asc, l.position asc, l.created_at asc, l.id asc) as rn
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
end $$;

-- 4) Cổng lấy URL video: tích hợp kiểm tra mở khóa tuần tự ở tầng Database
create or replace function fn_get_lesson_video(p_lesson uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
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

  -- Chủ khóa & admin: xem mọi trạng thái để soạn / duyệt
  if fn_owns_course(v_course) or fn_is_admin() then
    return v_url;
  end if;

  -- Học viên: phải đủ quyền nội dung (free / đã ghi danh) VÀ video đã duyệt VÀ bài đã mở khóa
  if (v_free or fn_is_enrolled(v_course)) and v_review = 'approved' and fn_is_lesson_unlocked(p_lesson) then
    return v_url;
  end if;

  return null;
end $$;
