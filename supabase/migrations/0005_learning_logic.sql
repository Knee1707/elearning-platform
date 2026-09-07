-- Migration: 0005_learning_logic.sql
-- Thành viên chịu trách nhiệm: M2 - DATA (Học tập & Đánh giá)
-- Vai trò: Cài đặt toàn bộ logic nghiệp vụ (stored procedures, views, triggers) cho cụm Học tập,
--          Chấm điểm thi cử, Cấp chứng chỉ, Điểm danh tự động, Q&A thảo luận và Thông báo.
-- Vị trí thực thi: Chạy sau 0004_content_logic.sql (M1) và trước 0006_spine_logic.sql (L).
-- Mọi tên hàm, view, trigger đều tuân thủ nghiêm ngặt DATA_DICTIONARY.md và hợp đồng Mục 6 PHAN_CONG.md.


-- 1. TIẾN ĐỘ HỌC TẬP (fn_update_watch, fn_save_position, fn_mark_complete)

-- Hàm: fn_update_watch
-- Mục đích: Cập nhật phần trăm (%) thời lượng bài học mà học viên đã xem.
-- Cơ chế hoạt động:
--   - Chèn mới hoặc cập nhật vào bảng lesson_progress của người dùng đang đăng nhập (auth.uid()).
--   - Cơ chế giữ mốc cao nhất: Dùng greatest(lesson_progress.watched_percent, excluded.watched_percent)
--     để phần trăm đã xem CHỈ TĂNG LÊN, không bị lùi khi học viên xem lại từ đầu.
--   - Giới hạn giá trị an toàn từ 0 đến 100%.
--   - Khi watched_percent tăng đến ngưỡng quy định (>= 95%), trigger trg_attendance_on_video sẽ tự động kích hoạt.
create or replace function fn_update_watch(p_lesson uuid, p_percent int)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into lesson_progress (user_id, lesson_id, watched_percent)
  values (auth.uid(), p_lesson, greatest(0, least(100, p_percent)))
  on conflict (user_id, lesson_id)
  do update set
    watched_percent = greatest(lesson_progress.watched_percent, excluded.watched_percent),
    updated_at = now();
end $$;

-- Hàm: fn_save_position
-- Mục đích: Lưu lại số giây hiện tại đang xem trên video bài giảng.
-- Cơ chế hoạt động:
--   - Lưu giá trị last_position_seconds vào bảng lesson_progress để khi quay lại bài học,
--     Player video có thể tự động tua đến đúng vị trí học viên đang học dở ("Học tiếp từ chỗ cũ").
create or replace function fn_save_position(p_lesson uuid, p_seconds int)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into lesson_progress (user_id, lesson_id, last_position_seconds)
  values (auth.uid(), p_lesson, greatest(0, p_seconds))
  on conflict (user_id, lesson_id)
  do update set
    last_position_seconds = greatest(0, p_seconds),
    updated_at = now();
end $$;

-- Hàm: fn_mark_complete
-- Mục đích: Đánh dấu một bài học là đã hoàn thành.
-- Cơ chế hoạt động:
--   - Đặt is_completed = true và nâng watched_percent lên tối đa 100%.
--   - Tự động phản ánh lên view_course_progress để tính lại tỷ lệ hoàn thành của cả khóa học.
create or replace function fn_mark_complete(p_lesson uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into lesson_progress (user_id, lesson_id, watched_percent, is_completed)
  values (auth.uid(), p_lesson, 100, true)
  on conflict (user_id, lesson_id)
  do update set
    watched_percent = 100,
    is_completed = true,
    updated_at = now();
end $$;


-- 2. VIEW TIẾN ĐỘ KHÓA HỌC (view_course_progress)

-- View: view_course_progress
-- Mục đích: Tính toán động tỷ lệ % hoàn thành khóa học của từng học viên theo thời gian thực.
-- Công thức tính: progress_percent = (số bài hoàn thành / tổng số bài trong khóa) * 100.
-- Cơ chế bảo mật:
--   - Sử dụng security_invoker = true để áp dụng chính sách RLS của người dùng đang gọi view.
--   - Lọc điều kiện exists enrollments (status = 'active') để bảo đảm chỉ hiển thị khóa học mà học viên đã ghi danh hợp lệ.
create or replace view view_course_progress with (security_invoker = true) as
select
  lp.user_id,
  c.id                                                     as course_id,
  c.title                                                  as course_title,
  count(l.id)                                              as total_lessons,
  count(lp.id) filter (where lp.is_completed = true)       as completed_lessons,
  case
    when count(l.id) = 0 then 0
    else round(
      count(lp.id) filter (where lp.is_completed = true)::numeric
      / count(l.id) * 100
    )
  end                                                      as progress_percent
from courses c
join chapters ch on ch.course_id = c.id
join lessons l   on l.chapter_id = ch.id
left join lesson_progress lp
       on lp.lesson_id = l.id and lp.user_id = auth.uid()
where exists (
  select 1 from enrollments e
  where e.course_id = c.id and e.user_id = auth.uid() and e.status = 'active'
)
group by lp.user_id, c.id, c.title;


-- 3. QUIZ VÀ BÀI THI (fn_get_quiz, fn_submit_attempt)

-- Hàm: fn_get_quiz
-- Mục đích: Lấy nội dung đề quiz (danh sách câu hỏi và các phương án trả lời).
-- Cơ chế bảo mật chống gian lận:
--   - Dùng security definer để bypass RLS (bình thường bảng options có policy chặn học viên đọc cờ is_correct).
--   - Trong câu lệnh SELECT, hàm CỐ TÌNH LOẠI BỎ cờ đúng/sai (is_correct).
--   - Nhờ đó, học viên hoàn toàn không thể xem trước đáp án đúng thông qua kiểm tra gói tin mạng (F12 Network).
create or replace function fn_get_quiz(p_quiz uuid)
returns table (
  quiz_id    uuid,
  quiz_title text,
  pass_score integer,
  question_id   uuid,
  question_text text,
  "position"    integer,
  option_id     uuid,
  option_text   text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    qz.id          as quiz_id,
    qz.title       as quiz_title,
    qz.pass_score,
    q.id           as question_id,
    q.content      as question_text,
    q.position,
    o.id           as option_id,
    o.content      as option_text
  from quizzes qz
  join questions q on q.quiz_id = qz.id
  join options   o on o.question_id = q.id
  where qz.id = p_quiz
  order by q.position, o.id;
$$;

-- Hàm: fn_submit_attempt
-- Mục đích: Chấm điểm bài thi và lưu lại kết quả làm bài của học viên.
-- Cơ chế hoạt động:
--   - Nhận vào: p_exam (UUID bài thi) và p_answers (JSONB dạng {"question_id": "option_id"}).
--   - Toàn bộ logic chấm điểm diễn ra khép kín trên Database server:
--     1. Tạo bản ghi lần thi mới trong exam_attempts.
--     2. Duyệt qua từng câu trả lời trong JSONB, chèn vào bảng answers và so khớp với options.is_correct.
--     3. Tính điểm trên thang 100: round(số câu đúng / tổng số câu * 100).
--     4. Cập nhật điểm số (score) và thời gian nộp (submitted_at) vào exam_attempts.
--     5. Khi bản ghi exam_attempts được update score, trigger trg_issue_certificate sẽ tự động kiểm tra để cấp chứng chỉ.
--   - Trả về điểm số đã chấm (từ 0 đến 100).
create or replace function fn_submit_attempt(p_exam uuid, p_answers jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_attempt   uuid;
  v_total     integer := 0;
  v_correct   integer := 0;
  v_score     integer;
  v_question  uuid;
  v_option    uuid;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập';
  end if;

  -- Tạo lần thi mới
  insert into exam_attempts (exam_id, user_id, started_at)
  values (p_exam, v_uid, now())
  returning id into v_attempt;

  -- Duyệt từng câu trả lời để lưu và tính điểm
  for v_question, v_option in
    select key::uuid, value::text::uuid
    from jsonb_each_text(p_answers)
  loop
    insert into answers (attempt_id, question_id, option_id)
    values (v_attempt, v_question, v_option)
    on conflict (attempt_id, question_id) do update set option_id = excluded.option_id;

    v_total := v_total + 1;

    -- So khớp với đáp án đúng trong bảng options
    if exists (
      select 1 from options o
      where o.id = v_option and o.question_id = v_question and o.is_correct = true
    ) then
      v_correct := v_correct + 1;
    end if;
  end loop;

  -- Quy đổi điểm số theo thang 100
  if v_total > 0 then
    v_score := round(v_correct::numeric / v_total * 100);
  else
    v_score := 0;
  end if;

  -- Cập nhật điểm và thời gian nộp bài
  update exam_attempts
  set score = v_score, submitted_at = now()
  where id = v_attempt;

  return v_score;
end $$;


-- 4. CHỨNG CHỈ (trg_issue_certificate, fn_verify_certificate, view_certificate)

-- Trigger function: fn_issue_certificate
-- Mục đích: Tự động cấp chứng chỉ khi học viên đạt điểm chuẩn của kỳ thi.
-- Cơ chế hoạt động:
--   - Kích hoạt sau khi exam_attempts cập nhật trường score và submitted_at.
--   - So sánh điểm số đạt được với pass_score của kỳ thi (bảng exams).
--   - Nếu đạt chuẩn (score >= pass_score):
--     1. Tự động sinh mã chứng chỉ ngẫu nhiên 16 ký tự hex (ví dụ: A1B2C3D4E5F60718).
--     2. Chèn vào bảng certificates với ràng buộc on conflict (user_id, course_id) do nothing để chống cấp trùng.
--     3. Tự động gửi thông báo dạng 'system' tới học viên kèm mã chứng chỉ vừa nhận.
create or replace function fn_issue_certificate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pass_score integer;
  v_course_id  uuid;
  v_code       text;
begin
  if new.submitted_at is null or new.score is null then
    return new;
  end if;

  -- Lấy điểm chuẩn và khóa học tương ứng của kỳ thi
  select e.pass_score, e.course_id
  into v_pass_score, v_course_id
  from exams e
  where e.id = new.exam_id;

  if not found then
    return new;
  end if;

  -- Đạt chuẩn thì sinh chứng chỉ
  if new.score >= v_pass_score then
    v_code := upper(encode(gen_random_bytes(8), 'hex'));

    insert into certificates (user_id, course_id, code)
    values (new.user_id, v_course_id, v_code)
    on conflict (user_id, course_id) do nothing;

    insert into notification (user_id, type, title, body)
    values (
      new.user_id,
      'system',
      'Chúc mừng! Bạn đã đạt chứng chỉ',
      'Mã chứng chỉ: ' || v_code
    )
    on conflict do nothing;
  end if;

  return new;
end $$;

drop trigger if exists trg_issue_certificate on exam_attempts;
create trigger trg_issue_certificate
  after update of score, submitted_at on exam_attempts
  for each row
  execute function fn_issue_certificate();

-- Hàm: fn_verify_certificate
-- Mục đích: Tra cứu và xác minh tính hợp lệ của chứng chỉ thông qua mã code.
-- Cơ chế: Công khai hoàn toàn (public lookup), bất kỳ ai có mã đều có thể tra cứu thông tin mà không cần đăng nhập.
create or replace function fn_verify_certificate(p_code text)
returns table (
  certificate_code text,
  student_name     text,
  course_title     text,
  issued_at        timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.code            as certificate_code,
    p.full_name       as student_name,
    cr.title          as course_title,
    c.issued_at
  from certificates c
  join profiles p  on p.id  = c.user_id
  join courses  cr on cr.id = c.course_id
  where c.code = upper(p_code);
$$;

-- View: view_certificate
-- Mục đích: Hiển thị danh sách chứng chỉ đã nhận trong trang hồ sơ cá nhân của học viên.
create or replace view view_certificate with (security_invoker = true) as
select
  c.id,
  c.code,
  c.issued_at,
  c.user_id,
  p.full_name       as student_name,
  c.course_id,
  cr.title          as course_title,
  cr.instructor_id,
  ip.full_name      as instructor_name
from certificates c
join profiles p   on p.id  = c.user_id
join courses  cr  on cr.id = c.course_id
join profiles ip  on ip.id = cr.instructor_id;


-- 5. ĐIỂM DANH TỰ ĐỘNG (trg_attendance_on_video, fn_join_live_session, view_attendance)

-- Trigger function: fn_attendance_on_video
-- Mục đích: Tự động ghi nhận điểm danh học tập qua video (Mục 8a PHAN_CONG.md).
-- Cơ chế hoạt động:
--   - Kích hoạt khi có thao tác INSERT hoặc UPDATE trên trường watched_percent của lesson_progress.
--   - Đọc ngưỡng phần trăm xem video từ bảng cấu hình system_setting (khóa 'attendance_video_percent', mặc định 95%).
--   - Tuyệt đối không hard-code số 95 trong code để cho phép quản trị viên thay đổi cấu hình linh hoạt.
--   - Khi watched_percent >= ngưỡng, tự động chèn bản ghi vào bảng attendance với nguồn source = 'video'.
--   - Dùng on conflict do nothing để bảo đảm mỗi học viên chỉ được tính điểm danh đúng 1 lần cho mỗi bài học.
create or replace function fn_attendance_on_video()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold integer;
  v_course_id uuid;
begin
  v_threshold := coalesce(
    (select (value #>> '{}')::integer from system_setting where key = 'attendance_video_percent'),
    95
  );

  if new.watched_percent >= v_threshold then
    select ch.course_id
    into v_course_id
    from lessons l
    join chapters ch on ch.id = l.chapter_id
    where l.id = new.lesson_id;

    if v_course_id is not null then
      insert into attendance (user_id, course_id, source, lesson_id)
      values (new.user_id, v_course_id, 'video', new.lesson_id)
      on conflict do nothing;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_attendance_on_video on lesson_progress;
create trigger trg_attendance_on_video
  after insert or update of watched_percent on lesson_progress
  for each row
  execute function fn_attendance_on_video();

-- Hàm: fn_join_live_session
-- Mục đích: Xử lý học viên vào học trực tiếp Google Meet và tự động điểm danh (Mục 8b PHAN_CONG.md).
-- Cơ chế hoạt động:
--   - Học viên bấm nút "Vào học trực tiếp".
--   - Hàm lập tức chèn bản ghi điểm danh source = 'live' vào bảng attendance trước.
--   - Sau khi ghi nhận thành công mới trả về đường dẫn meet_url để mở tab Google Meet.
--   - Ngăn chặn triệt để tình trạng học viên vào phòng học nhưng "quên" thao tác điểm danh.
create or replace function fn_join_live_session(p_live uuid)
returns text
language plpgsql
security definer
set search_path = public
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

  -- Điểm danh trước
  insert into attendance (user_id, course_id, source, live_session_id)
  values (auth.uid(), v_ls.course_id, 'live', p_live)
  on conflict do nothing;

  -- Trả URL sau
  return v_ls.meet_url;
end $$;

-- View: view_attendance
-- Mục đích: Báo cáo chuyên cần và lịch sử điểm danh.
-- Phục vụ cả 2 vai trò: Học viên xem lịch sử của mình, Giảng viên xem danh sách điểm danh cả lớp.
create or replace view view_attendance with (security_invoker = true) as
select
  a.id,
  a.user_id,
  p.full_name                                     as student_name,
  a.course_id,
  c.title                                         as course_title,
  a.source,
  a.lesson_id,
  l.title                                         as lesson_title,
  a.live_session_id,
  ls.title                                        as live_session_title,
  ls.scheduled_at,
  a.attended_at
from attendance a
join profiles     p  on p.id  = a.user_id
join courses      c  on c.id  = a.course_id
left join lessons l  on l.id  = a.lesson_id
left join live_sessions ls on ls.id = a.live_session_id
order by a.attended_at desc;


-- 6. GHI CHÚ THEO MỐC VIDEO (fn_add_note)

-- Hàm: fn_add_note
-- Mục đích: Lưu ghi chú cá nhân của học viên gắn với số giây hiện tại trên video.
create or replace function fn_add_note(p_lesson uuid, p_seconds int, p_content text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Chưa đăng nhập';
  end if;
  if p_content is null or trim(p_content) = '' then
    raise exception 'Nội dung ghi chú không được rỗng';
  end if;

  insert into lesson_note (user_id, lesson_id, timestamp_seconds, content)
  values (auth.uid(), p_lesson, greatest(0, p_seconds), trim(p_content))
  returning id into v_id;

  return v_id;
end $$;


-- 7. THẢO LUẬN VÀ THÔNG BÁO (fn_ask_question, fn_answer_question, trg_notify_on_answer, fn_mark_read)

-- Hàm: fn_ask_question
-- Mục đích: Đăng câu hỏi thảo luận dưới bài học.
create or replace function fn_ask_question(p_lesson uuid, p_content text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Chưa đăng nhập';
  end if;
  if p_content is null or trim(p_content) = '' then
    raise exception 'Nội dung câu hỏi không được rỗng';
  end if;

  insert into qa_question (lesson_id, user_id, content)
  values (p_lesson, auth.uid(), trim(p_content))
  returning id into v_id;

  return v_id;
end $$;

-- Hàm: fn_answer_question
-- Mục đích: Gửi câu trả lời cho thắc mắc của học viên.
-- Khi câu trả lời được ghi nhận, hàm sẽ tự động tạo thông báo gửi tới người đặt câu hỏi.
create or replace function fn_answer_question(p_question uuid, p_content text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id           uuid;
  v_question_uid uuid;
  v_lesson_id    uuid;
  v_course_id    uuid;
  v_instructor   uuid;
begin
  if auth.uid() is null then
    raise exception 'Chưa đăng nhập';
  end if;
  if p_content is null or trim(p_content) = '' then
    raise exception 'Nội dung câu trả lời không được rỗng';
  end if;

  select user_id, lesson_id
  into v_question_uid, v_lesson_id
  from qa_question
  where id = p_question;

  if not found then
    raise exception 'Không tìm thấy câu hỏi';
  end if;

  select c.instructor_id
  into v_instructor
  from lessons l
  join chapters ch on ch.id = l.chapter_id
  join courses  c  on c.id  = ch.course_id
  where l.id = v_lesson_id;

  insert into qa_answer (question_id, user_id, content)
  values (p_question, auth.uid(), trim(p_content))
  returning id into v_id;

  -- Tạo thông báo nếu người trả lời khác người hỏi
  if v_question_uid <> auth.uid() then
    insert into notification (user_id, type, title, body)
    values (
      v_question_uid,
      'reply',
      'Câu hỏi của bạn đã được trả lời',
      left(trim(p_content), 120)
    );
  end if;

  return v_id;
end $$;

-- Trigger function: fn_notify_on_answer
-- Mục đích: Đảm bảo nếu có ứng dụng hoặc công cụ bên ngoài chèn trực tiếp vào bảng qa_answer thì vẫn tự sinh thông báo.
create or replace function fn_notify_on_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_uid uuid;
  v_preview      text;
begin
  select user_id into v_question_uid
  from qa_question where id = new.question_id;

  if v_question_uid is null or v_question_uid = new.user_id then
    return new;
  end if;

  v_preview := left(new.content, 120);

  insert into notification (user_id, type, title, body)
  values (v_question_uid, 'reply', 'Câu hỏi của bạn đã được trả lời', v_preview)
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists trg_notify_on_answer on qa_answer;
create trigger trg_notify_on_answer
  after insert on qa_answer
  for each row
  execute function fn_notify_on_answer();

-- Hàm: fn_mark_read
-- Mục đích: Đánh dấu một thông báo là đã đọc (chỉ cho phép sửa thông báo của chính mình).
create or replace function fn_mark_read(p_notification uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update notification
  set is_read = true
  where id = p_notification and user_id = auth.uid();
end $$;
