-- 0025_auto_issue_certificate.sql
-- Tự động cấp chứng chỉ chính quy khi hoàn thành video + bài quiz + bài thi cuối khóa (nếu có).

-- Cập nhật fn_submit_attempt: Khi thi đạt bài thi cuối khóa, tự động cấp chứng chỉ chính quy (approved) ngay lập tức
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
        and not exists (
          select 1 from lesson_progress lp
          where lp.lesson_id = l.id and lp.user_id = v_uid and (lp.is_completed or lp.watched_percent >= 95)
        )
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

  -- Nếu là kỳ thi cuối khóa và đạt điểm chuẩn: Tự động cấp chứng chỉ chính quy ngay (approved)
  if v_final and v_score >= (select pass_score from exams where id = p_exam) then
    v_code := 'CERT-' || upper(encode(gen_random_bytes(6), 'hex'));
    insert into certificates (user_id, course_id, code, status, issued_at)
      values (v_uid, v_course, v_code, 'approved', now())
      on conflict (user_id, course_id) do update
        set status = 'approved',
            issued_at = coalesce(certificates.issued_at, now());

    insert into notification (user_id, type, title, body)
      values (v_uid, 'system', 'Chứng chỉ hoàn thành khóa học',
              'Chúc mừng bạn đã hoàn thành xuất sắc kỳ thi cuối khóa "' || coalesce(v_title, '') || '" và được cấp chứng chỉ chính quy!');
  end if;
  return v_score;
end $$;

-- Cập nhật fn_request_certificate: Tự động kiểm tra điều kiện (toàn bộ video + quiz + bài thi nếu có) và cấp luôn chứng chỉ approved
create or replace function fn_request_certificate(p_course uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_existing text; v_title text; v_instructor uuid; v_exam uuid; v_code text;
  v_has_final boolean := false;
begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập'; end if;
  if not fn_is_enrolled(p_course) then raise exception 'Bạn chưa tham gia khóa học này'; end if;

  -- 1. Điều kiện video: Bắt buộc hoàn thành mọi bài học trong khóa học
  if exists (
    select 1 from lessons l join chapters ch on ch.id = l.chapter_id
    where ch.course_id = p_course
      and not exists (
        select 1 from lesson_progress lp
        where lp.lesson_id = l.id and lp.user_id = auth.uid() and (lp.is_completed or lp.watched_percent >= 95)
      )
  ) then
    raise exception 'Bạn cần hoàn thành toàn bộ video bài giảng trước khi nhận chứng chỉ';
  end if;

  -- 2. Điều kiện quiz: Phải làm đầy đủ và đạt các bài quiz bài học
  if exists (
    select 1 from quizzes q
    join lessons l on l.id = q.lesson_id
    join chapters ch on ch.id = l.chapter_id
    where ch.course_id = p_course
      and not exists (
        select 1 from lesson_progress lp
        where lp.lesson_id = q.lesson_id and lp.user_id = auth.uid() and lp.is_quiz_passed
      )
  ) then
    raise exception 'Bạn cần hoàn thành và đạt tất cả các bài quiz trong khóa học';
  end if;

  -- 3. Điều kiện bài thi cuối khóa (nếu khóa học có bài thi cuối khóa)
  select exists (
    select 1 from exams e where e.course_id = p_course and e.is_final
  ) into v_has_final;

  if v_has_final then
    select e.id into v_exam
    from exams e
    where e.course_id = p_course and e.is_final
      and exists (
        select 1 from exam_attempts a
        where a.exam_id = e.id and a.user_id = auth.uid()
          and a.score is not null and a.score >= e.pass_score
      )
    limit 1;
    if v_exam is null then
      raise exception 'Khóa học này yêu cầu đạt kỳ thi cuối khóa để được cấp chứng nhận';
    end if;
  end if;

  select status into v_existing from certificates where user_id = auth.uid() and course_id = p_course;
  if v_existing = 'approved' then raise exception 'Bạn đã có chứng nhận của khóa học này'; end if;

  -- Tự động cấp chứng chỉ chính quy (approved)
  v_code := 'CERT-' || upper(encode(gen_random_bytes(6), 'hex'));
  insert into certificates (user_id, course_id, code, status, issued_at)
    values (auth.uid(), p_course, v_code, 'approved', now())
  on conflict (user_id, course_id) do update
    set status = 'approved',
        issued_at = coalesce(certificates.issued_at, now());

  select title, instructor_id into v_title, v_instructor from courses where id = p_course;
  insert into notification (user_id, type, title, body)
    values (auth.uid(), 'system', 'Chứng chỉ hoàn thành khóa học',
            'Chúc mừng bạn đã hoàn thành xuất sắc khóa học "' || coalesce(v_title, '') || '" và được cấp chứng chỉ chính quy!');
end $$;
