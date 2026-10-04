-- 0027_auto_issue_certificate.sql
-- Đạt kỳ thi cuối khóa thì cấp chứng chỉ ngay; không còn bước chờ duyệt.

-- Các yêu cầu cũ đang chờ duyệt được chuyển thành chứng chỉ đã cấp khi chuyển luồng.
update certificates
set status = 'approved', issued_at = coalesce(issued_at, now())
where status = 'pending';

-- Giảng viên chỉ được xem log cấp chứng chỉ thuộc khóa mình phụ trách.
drop policy if exists activity_select_certificate_course_instructor on activity_log;
create policy activity_select_certificate_course_instructor on activity_log
  for select using (
    entity = 'certificate'
    and action = 'issue_certificate'
    and metadata ? 'course_id'
    and fn_owns_course(case
      when metadata->>'course_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (metadata->>'course_id')::uuid
      else null
    end)
  );

create or replace function fn_submit_attempt(p_exam uuid, p_answers jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_attempt uuid;
  v_certificate uuid;
  v_total integer;
  v_correct integer := 0;
  v_score integer;
  v_question uuid;
  v_option uuid;
  v_course uuid;
  v_quiz uuid;
  v_final boolean;
  v_code text;
  v_title text;
  v_instructor uuid;
  v_pass_score integer;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;

  select e.course_id, e.quiz_id, e.is_final, e.title, e.pass_score, c.instructor_id
    into v_course, v_quiz, v_final, v_title, v_pass_score, v_instructor
  from exams e join courses c on c.id = e.course_id
  where e.id = p_exam;
  if v_course is null then raise exception 'Không tìm thấy kỳ thi'; end if;

  if v_final then
    if not fn_is_enrolled(v_course) then raise exception 'Bạn chưa ghi danh khóa học này'; end if;
    if exists (
      select 1 from lessons l join chapters ch on ch.id = l.chapter_id
      where ch.course_id = v_course
        and not exists (
          select 1 from lesson_progress lp
          where lp.lesson_id = l.id and lp.user_id = v_uid and lp.is_completed
        )
    ) then
      raise exception 'Bạn cần hoàn thành toàn bộ nội dung khóa học trước khi thi';
    end if;
  end if;

  select count(*) into v_total from questions where quiz_id = v_quiz;
  if v_total = 0 then raise exception 'Kỳ thi chưa có câu hỏi'; end if;

  insert into exam_attempts (exam_id, user_id) values (p_exam, v_uid) returning id into v_attempt;
  for v_question, v_option in
    select key::uuid, value::text::uuid from jsonb_each_text(coalesce(p_answers, '{}'::jsonb))
  loop
    if exists (select 1 from questions where id = v_question and quiz_id = v_quiz) then
      insert into answers (attempt_id, question_id, option_id)
        values (v_attempt, v_question, v_option)
        on conflict (attempt_id, question_id) do update set option_id = excluded.option_id;
      if exists (select 1 from options where id = v_option and question_id = v_question and is_correct) then
        v_correct := v_correct + 1;
      end if;
    end if;
  end loop;

  v_score := round(v_correct::numeric / v_total * 100);
  update exam_attempts set score = v_score, submitted_at = now() where id = v_attempt;

  if v_final and v_score >= v_pass_score then
    v_code := upper(encode(gen_random_bytes(8), 'hex'));
    insert into certificates (user_id, course_id, code, status, issued_at)
      values (v_uid, v_course, v_code, 'approved', now())
      on conflict (user_id, course_id) do update set
        status = 'approved',
        issued_at = coalesce(certificates.issued_at, excluded.issued_at)
      returning id, code into v_certificate, v_code;

    perform fn_log_activity(
      'issue_certificate', 'certificate', v_certificate, null,
      jsonb_build_object(
        'course_id', v_course,
        'student_id', v_uid,
        'source', 'final_exam',
        'score', v_score,
        'pass_score', v_pass_score,
        'course_title', v_title
      )
    );

    insert into notification (user_id, type, title, body)
      values (v_uid, 'system', 'Chứng chỉ đã được cấp tự động',
              'Bạn đạt ' || v_score || '/' || v_pass_score || ' điểm ở kỳ thi cuối khóa "' || coalesce(v_title, '') || '". Mã: ' || v_code);
    if v_instructor is not null and v_instructor <> v_uid then
      insert into notification (user_id, type, title, body)
        values (v_instructor, 'system', 'Đã cấp chứng chỉ cho học viên',
                'Học viên đã đạt kỳ thi cuối khóa "' || coalesce(v_title, '') || '". Log đã được ghi theo khóa học.');
    end if;
    insert into notification (user_id, type, title, body)
      select id, 'system', 'Chứng chỉ được cấp tự động',
             'Có học viên đạt kỳ thi cuối khóa "' || coalesce(v_title, '') || '". Vui lòng theo dõi audit log.'
      from profiles where role in ('admin', 'super_admin') and id <> v_uid;
  end if;

  return v_score;
end $$;

-- Nút xin cấp chứng chỉ cũ không còn hợp lệ vì chứng chỉ đã cấp ngay khi đạt.
create or replace function fn_request_certificate(p_course uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Chứng chỉ được cấp tự động ngay sau khi bạn đạt kỳ thi cuối khóa';
end $$;

-- Vô hiệu hóa hoàn toàn API duyệt cũ, tránh client cũ tiếp tục tạo luồng duyệt.
drop function if exists fn_review_certificate(uuid, boolean);
