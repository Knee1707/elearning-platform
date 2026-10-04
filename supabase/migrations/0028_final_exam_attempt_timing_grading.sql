-- 0028_final_exam_attempt_timing_grading.sql
-- Ràng buộc thời gian thi cuối khóa và chấm bài tự luận.

alter table exam_attempts
  add column if not exists status text not null default 'in_progress',
  add column if not exists is_time_expired boolean not null default false,
  add column if not exists graded_at timestamptz,
  add column if not exists graded_by uuid references profiles(id) on delete set null,
  add column if not exists grader_feedback text;

alter table answers add column if not exists answer_text text;

alter table exam_attempts drop constraint if exists exam_attempts_status_check;
alter table exam_attempts add constraint exam_attempts_status_check
  check (status in ('in_progress', 'submitted', 'pending_grading', 'graded', 'expired'));

create or replace function fn_start_final_exam(p_exam uuid)
returns table (attempt_id uuid, started_at timestamptz, expires_at timestamptz, time_limit_minutes integer)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_course uuid;
  v_minutes integer;
  v_attempt uuid;
  v_started timestamptz;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select e.course_id, e.time_limit_minutes into v_course, v_minutes
  from exams e where e.id = p_exam and e.is_final = true;
  if v_course is null then raise exception 'Không tìm thấy kỳ thi cuối khóa'; end if;
  if not fn_is_enrolled(v_course) then raise exception 'Bạn chưa ghi danh khóa học này'; end if;
  if exists (
    select 1 from lessons l join chapters ch on ch.id = l.chapter_id
    where ch.course_id = v_course
      and not exists (select 1 from lesson_progress lp where lp.lesson_id = l.id and lp.user_id = v_uid and lp.is_completed)
  ) then raise exception 'Bạn cần hoàn thành toàn bộ nội dung khóa học trước khi thi'; end if;
  if not exists (select 1 from questions q join exams e on e.quiz_id = q.quiz_id where e.id = p_exam) then
    raise exception 'Kỳ thi chưa có câu hỏi';
  end if;

  insert into exam_attempts (exam_id, user_id, status)
  values (p_exam, v_uid, 'in_progress')
  returning id, started_at into v_attempt, v_started;
  return query select v_attempt, v_started, v_started + make_interval(mins => v_minutes), v_minutes;
end $$;

drop function if exists fn_submit_attempt(uuid, jsonb);
drop function if exists fn_submit_attempt(uuid, jsonb, uuid);
create or replace function fn_submit_attempt(p_exam uuid, p_answers jsonb, p_attempt uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_attempt uuid := p_attempt; v_total integer; v_mc_total integer;
  v_correct integer := 0; v_score integer; v_question uuid; v_option uuid; v_answer text;
  v_course uuid; v_quiz uuid; v_final boolean; v_title text; v_instructor uuid; v_pass_score integer;
  v_started timestamptz; v_expired boolean := false; v_has_essay boolean := false;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select e.course_id, e.quiz_id, e.is_final, e.title, e.pass_score, c.instructor_id
    into v_course, v_quiz, v_final, v_title, v_pass_score, v_instructor
  from exams e join courses c on c.id = e.course_id where e.id = p_exam;
  if v_course is null then raise exception 'Không tìm thấy kỳ thi'; end if;
  if v_final and not fn_is_enrolled(v_course) then raise exception 'Bạn chưa ghi danh khóa học này'; end if;
  if v_final and exists (
    select 1 from lessons l join chapters ch on ch.id = l.chapter_id
    where ch.course_id = v_course and not exists (
      select 1 from lesson_progress lp where lp.lesson_id = l.id and lp.user_id = v_uid and lp.is_completed
    )
  ) then raise exception 'Bạn cần hoàn thành toàn bộ nội dung khóa học trước khi thi'; end if;

  if v_attempt is null then
    insert into exam_attempts (exam_id, user_id, status) values (p_exam, v_uid, 'in_progress') returning id, started_at into v_attempt, v_started;
  else
    select started_at into v_started from exam_attempts where id = v_attempt and exam_id = p_exam and user_id = v_uid and status = 'in_progress' for update;
    if v_started is null then raise exception 'Lần thi không hợp lệ hoặc đã được nộp'; end if;
  end if;
  select now() > v_started + make_interval(mins => e.time_limit_minutes) into v_expired from exams e where e.id = p_exam;

  select count(*) filter (where q.content not ilike '[Tự luận]%'), count(*)
    into v_mc_total, v_total from questions q where q.quiz_id = v_quiz;
  if v_total = 0 then raise exception 'Kỳ thi chưa có câu hỏi'; end if;
  v_has_essay := exists (select 1 from questions q where q.quiz_id = v_quiz and q.content ilike '[Tự luận]%');

  for v_question, v_option, v_answer in
    select key::uuid, nullif(value->>'option_id','')::uuid, value->>'answer_text'
    from jsonb_each(coalesce(p_answers, '{}'::jsonb))
  loop
    if exists (select 1 from questions q where q.id = v_question and q.quiz_id = v_quiz) then
      insert into answers (attempt_id, question_id, option_id, answer_text)
        values (v_attempt, v_question, v_option, v_answer)
        on conflict (attempt_id, question_id) do update set option_id = excluded.option_id, answer_text = excluded.answer_text;
      if exists (select 1 from options where id = v_option and question_id = v_question and is_correct) then v_correct := v_correct + 1; end if;
    end if;
  end loop;

  v_score := case when v_mc_total = 0 then null else round(v_correct::numeric / v_mc_total * 100) end;
  update exam_attempts set score = v_score, submitted_at = now(), is_time_expired = v_expired,
    status = case when v_has_essay then 'pending_grading' when v_expired then 'expired' else 'submitted' end
    where id = v_attempt;

  if v_final and not v_has_essay and v_score >= v_pass_score then
    perform fn_issue_certificate_for_exam(v_uid, v_course, v_title, v_score, v_pass_score, v_instructor);
  end if;
  return v_score;
end $$;

create or replace function fn_issue_certificate_for_exam(
  p_user uuid, p_course uuid, p_title text, p_score integer, p_pass_score integer, p_instructor uuid
) returns void language plpgsql security definer set search_path = public as $$
declare v_certificate uuid; v_code text;
begin
  v_code := upper(encode(gen_random_bytes(8), 'hex'));
  insert into certificates (user_id, course_id, code, status, issued_at)
    values (p_user, p_course, v_code, 'approved', now())
    on conflict (user_id, course_id) do update set status = 'approved', issued_at = coalesce(certificates.issued_at, excluded.issued_at)
    returning id, code into v_certificate, v_code;
  perform fn_log_activity('issue_certificate', 'certificate', v_certificate, null,
    jsonb_build_object('course_id', p_course, 'student_id', p_user, 'source', 'final_exam', 'score', p_score, 'pass_score', p_pass_score, 'course_title', p_title));
  insert into notification (user_id, type, title, body) values (p_user, 'system', 'Chứng chỉ đã được cấp', 'Bạn đạt ' || p_score || '/' || p_pass_score || ' điểm ở kỳ thi cuối khóa. Mã: ' || v_code);
  if p_instructor is not null and p_instructor <> p_user then
    insert into notification (user_id, type, title, body) values (p_instructor, 'system', 'Đã cấp chứng chỉ cho học viên', 'Học viên đã đạt kỳ thi cuối khóa. Log đã được ghi theo khóa học.');
  end if;
end $$;

create or replace function fn_grade_final_exam_attempt(p_attempt uuid, p_score integer, p_feedback text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_course uuid; v_user uuid; v_title text; v_pass integer; v_instructor uuid;
begin
  if p_score is null or p_score not between 0 and 100 then raise exception 'Điểm chấm phải từ 0 đến 100'; end if;
  select e.course_id, a.user_id, e.title, e.pass_score, c.instructor_id into v_course, v_user, v_title, v_pass, v_instructor
  from exam_attempts a join exams e on e.id = a.exam_id join courses c on c.id = e.course_id
  where a.id = p_attempt and e.is_final and a.status = 'pending_grading';
  if v_course is null then raise exception 'Không tìm thấy bài tự luận đang chờ chấm'; end if;
  if not (fn_owns_course(v_course) or fn_is_admin()) then raise exception 'Bạn không có quyền chấm bài này'; end if;
  update exam_attempts set score = p_score, graded_at = now(), graded_by = auth.uid(), grader_feedback = p_feedback, status = 'graded' where id = p_attempt;
  insert into notification (user_id, type, title, body) values (v_user, 'system', case when p_score >= v_pass then 'Bài thi đã đạt yêu cầu' else 'Đã có kết quả bài thi' end,
    'Giảng viên đã chấm bài thi cuối khóa "' || coalesce(v_title,'') || '" với điểm ' || p_score || '/100.' || case when p_score >= v_pass then ' Chứng chỉ đã được cấp.' else '' end);
  if p_score >= v_pass then perform fn_issue_certificate_for_exam(v_user, v_course, v_title, p_score, v_pass, v_instructor); end if;
end $$;
