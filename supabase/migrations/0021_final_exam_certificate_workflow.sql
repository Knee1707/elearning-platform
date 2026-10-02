-- 0021_final_exam_certificate_workflow.sql
-- Kỳ thi cuối khóa + duyệt chứng nhận bởi giảng viên.

-- Quiz cuối khóa không gắn với một bài học cụ thể.
alter table quizzes alter column lesson_id drop not null;
alter table quizzes add column if not exists course_id uuid references courses (id) on delete cascade;
alter table quizzes add column if not exists is_final boolean not null default false;

alter table exams add column if not exists quiz_id uuid references quizzes (id) on delete cascade;
alter table exams add column if not exists is_final boolean not null default false;
create unique index if not exists uq_exams_one_final_per_course
  on exams (course_id) where is_final = true;

-- Cho phép RLS xác định khóa cha cho quiz bài học và quiz cuối khóa.
create or replace function fn_quiz_course(qid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select course_id from quizzes where id = qid and course_id is not null),
    (select fn_lesson_course(lesson_id) from quizzes where id = qid)
  )
$$;

drop policy if exists quizzes_select on quizzes;
create policy quizzes_select on quizzes
  for select using (fn_course_visible(fn_quiz_course(id)));
drop policy if exists quizzes_write on quizzes;
create policy quizzes_write on quizzes
  for all using (fn_owns_course(fn_quiz_course(id)) or fn_is_admin())
          with check (fn_owns_course(fn_quiz_course(id)) or fn_is_admin());

-- GV tạo duy nhất một kỳ thi cuối khóa cho khóa mình phụ trách.
create or replace function fn_create_final_exam(
  p_course uuid,
  p_title text,
  p_time_limit integer,
  p_pass_score integer
)
returns table (exam_id uuid, quiz_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_quiz uuid;
  v_exam uuid;
  v_title text := nullif(trim(p_title), '');
begin
  if not (fn_owns_course(p_course) or fn_is_admin()) then
    raise exception 'Chỉ giảng viên phụ trách khóa học mới được tạo kỳ thi';
  end if;
  if v_title is null then raise exception 'Tên kỳ thi không được để trống'; end if;
  if p_time_limit is null or p_time_limit <= 0 then raise exception 'Thời lượng kỳ thi phải lớn hơn 0 phút'; end if;
  if p_pass_score is null or p_pass_score not between 0 and 100 then raise exception 'Điểm đạt phải từ 0 đến 100'; end if;
  if exists (select 1 from exams where course_id = p_course and is_final) then
    raise exception 'Khóa học đã có kỳ thi cuối khóa';
  end if;

  insert into quizzes (course_id, lesson_id, title, pass_score, is_final)
    values (p_course, null, v_title, p_pass_score, true)
    returning id into v_quiz;
  insert into exams (course_id, quiz_id, title, time_limit_minutes, pass_score, is_final)
    values (p_course, v_quiz, v_title, p_time_limit, p_pass_score, true)
    returning id into v_exam;

  return query select v_exam, v_quiz;
end $$;

-- Học viên chỉ lấy được đề cuối khóa khi đã hoàn thành toàn bộ bài học.
create or replace function fn_get_quiz(p_quiz uuid)
returns table (
  quiz_id uuid, quiz_title text, pass_score integer, question_id uuid,
  question_text text, "position" integer, option_id uuid, option_text text
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_course uuid;
  v_is_final boolean;
begin
  v_course := fn_quiz_course(p_quiz);
  select is_final into v_is_final from quizzes where id = p_quiz;
  if v_is_final then
    if not fn_is_enrolled(v_course) then raise exception 'Bạn chưa ghi danh khóa học này'; end if;
    if exists (
      select 1 from lessons l join chapters ch on ch.id = l.chapter_id
      where ch.course_id = v_course
        and not exists (
          select 1 from lesson_progress lp
          where lp.lesson_id = l.id and lp.user_id = auth.uid() and lp.is_completed
        )
    ) then
      raise exception 'Bạn cần hoàn thành toàn bộ nội dung khóa học trước khi thi';
    end if;
  end if;

  return query
  select qz.id, qz.title, qz.pass_score, q.id, q.content, q.position, o.id, o.content
  from quizzes qz
  join questions q on q.quiz_id = qz.id
  join options o on o.question_id = q.id
  where qz.id = p_quiz
  order by q.position, o.id;
end $$;

-- Chấm thi cuối khóa, tự tạo yêu cầu chứng nhận và báo cho GV/admin.
create or replace function fn_submit_attempt(p_exam uuid, p_answers jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_attempt uuid; v_total integer; v_correct integer := 0;
  v_score integer; v_question uuid; v_option uuid; v_course uuid; v_quiz uuid;
  v_final boolean; v_code text; v_title text; v_instructor uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select e.course_id, e.quiz_id, e.is_final, e.title, c.instructor_id
    into v_course, v_quiz, v_final, v_title, v_instructor
    from exams e join courses c on c.id = e.course_id where e.id = p_exam;
  if v_course is null then raise exception 'Không tìm thấy kỳ thi'; end if;
  if v_final then
    if not fn_is_enrolled(v_course) then raise exception 'Bạn chưa ghi danh khóa học này'; end if;
    if exists (
      select 1 from lessons l join chapters ch on ch.id = l.chapter_id
      where ch.course_id = v_course
        and not exists (select 1 from lesson_progress lp where lp.lesson_id = l.id and lp.user_id = v_uid and lp.is_completed)
    ) then raise exception 'Bạn cần hoàn thành toàn bộ nội dung khóa học trước khi thi'; end if;
  end if;
  select count(*) into v_total from questions where quiz_id = v_quiz;
  if v_total = 0 then raise exception 'Kỳ thi chưa có câu hỏi'; end if;

  insert into exam_attempts (exam_id, user_id) values (p_exam, v_uid) returning id into v_attempt;
  for v_question, v_option in select key::uuid, value::text::uuid from jsonb_each_text(coalesce(p_answers, '{}'::jsonb)) loop
    if exists (select 1 from questions where id = v_question and quiz_id = v_quiz) then
      insert into answers (attempt_id, question_id, option_id) values (v_attempt, v_question, v_option)
        on conflict (attempt_id, question_id) do update set option_id = excluded.option_id;
      if exists (select 1 from options where id = v_option and question_id = v_question and is_correct) then v_correct := v_correct + 1; end if;
    end if;
  end loop;
  v_score := round(v_correct::numeric / v_total * 100);
  update exam_attempts set score = v_score, submitted_at = now() where id = v_attempt;

  if v_final and v_score >= (select pass_score from exams where id = p_exam) then
    v_code := upper(encode(gen_random_bytes(8), 'hex'));
    insert into certificates (user_id, course_id, code, status)
      values (v_uid, v_course, v_code, 'pending')
      on conflict (user_id, course_id) do update
        set status = case when certificates.status = 'approved' then 'approved' else 'pending' end;
    insert into notification (user_id, type, title, body)
      values (v_instructor, 'system', 'Yêu cầu duyệt chứng nhận mới',
              'Học viên đã đạt kỳ thi cuối khóa "' || coalesce(v_title, '') || '". Vui lòng xem và duyệt.');
    insert into notification (user_id, type, title, body)
      select id, 'system', 'Có yêu cầu chứng nhận cần xử lý',
             'Học viên vừa đạt kỳ thi cuối khóa "' || coalesce(v_title, '') || '".'
      from profiles where role in ('admin', 'super_admin') and id <> auth.uid();
  end if;
  return v_score;
end $$;

-- Luồng dự phòng cho nút xin cấp chứng nhận cũ: vẫn yêu cầu đủ nội dung và đạt kỳ thi cuối khóa.
create or replace function fn_request_certificate(p_course uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_existing text; v_title text; v_instructor uuid; v_exam uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập'; end if;
  if not fn_is_enrolled(p_course) then raise exception 'Bạn chưa tham gia khóa học này'; end if;
  if exists (
    select 1 from lessons l join chapters ch on ch.id = l.chapter_id
    where ch.course_id = p_course
      and not exists (
        select 1 from lesson_progress lp
        where lp.lesson_id = l.id and lp.user_id = auth.uid() and lp.is_completed
      )
  ) then
    raise exception 'Bạn cần hoàn thành toàn bộ nội dung khóa học trước khi xin chứng nhận';
  end if;
  select e.id into v_exam
  from exams e
  where e.course_id = p_course and e.is_final
    and exists (
      select 1 from exam_attempts a
      where a.exam_id = e.id and a.user_id = auth.uid()
        and a.score is not null and a.score >= e.pass_score
    )
  limit 1;
  if v_exam is null then raise exception 'Bạn cần đạt kỳ thi cuối khóa trước khi xin chứng nhận'; end if;

  select status into v_existing from certificates where user_id = auth.uid() and course_id = p_course;
  if v_existing = 'approved' then raise exception 'Bạn đã có chứng nhận của khóa học này'; end if;
  if v_existing = 'pending' then raise exception 'Yêu cầu của bạn đang chờ giảng viên duyệt'; end if;

  v_code := upper(encode(gen_random_bytes(8), 'hex'));
  insert into certificates (user_id, course_id, code, status)
    values (auth.uid(), p_course, v_code, 'pending')
  on conflict (user_id, course_id) do update set status = 'pending';

  select title, instructor_id into v_title, v_instructor from courses where id = p_course;
  insert into notification (user_id, type, title, body)
    values (v_instructor, 'system', 'Yêu cầu duyệt chứng nhận mới',
            'Học viên đã đạt kỳ thi cuối khóa của khóa "' || coalesce(v_title, '') || '".');
  insert into notification (user_id, type, title, body)
    select id, 'system', 'Có yêu cầu chứng nhận cần xử lý',
           'Có yêu cầu chứng nhận mới cho khóa "' || coalesce(v_title, '') || '".'
    from profiles where role in ('admin', 'super_admin') and id <> auth.uid();
end $$;

-- GV phụ trách được xem và duyệt yêu cầu; admin vẫn có quyền xử lý dự phòng.
drop policy if exists certificates_select_own on certificates;
create policy certificates_select_own on certificates
  for select using (user_id = auth.uid() or fn_owns_course(course_id) or fn_is_admin());

create or replace function fn_review_certificate(p_certificate uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_course uuid; v_code text; v_title text; v_action text;
begin
  select user_id, course_id, code into v_user, v_course, v_code
    from certificates where id = p_certificate and status = 'pending';
  if not found then raise exception 'Không tìm thấy yêu cầu chứng nhận đang chờ'; end if;
  if not (fn_owns_course(v_course) or fn_is_admin()) then raise exception 'Chỉ giảng viên phụ trách hoặc admin được duyệt'; end if;
  select title into v_title from courses where id = v_course;
  if p_approve then
    update certificates set status = 'approved', issued_at = now() where id = p_certificate;
    insert into notification (user_id, type, title, body)
      values (v_user, 'system', 'Yêu cầu chứng nhận đã được duyệt', 'Mã chứng nhận: ' || v_code);
    v_action := 'approve_certificate';
  else
    update certificates set status = 'rejected' where id = p_certificate;
    insert into notification (user_id, type, title, body)
      values (v_user, 'system', 'Yêu cầu chứng nhận bị từ chối', 'Khóa học: "' || coalesce(v_title, '') || '".');
    v_action := 'reject_certificate';
  end if;
  perform fn_log_activity(v_action, 'certificate', p_certificate, null,
    jsonb_build_object('course_id', v_course, 'student_id', v_user, 'approved_by_role',
      (select role from profiles where id = auth.uid())));
end $$;
