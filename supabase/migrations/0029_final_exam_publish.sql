-- 0029_final_exam_publish.sql
-- Giảng viên xác nhận và đẩy đề cuối khóa cho học viên.

alter table exams add column if not exists is_published boolean not null default false;
alter table quizzes add column if not exists is_published boolean not null default false;

create or replace function fn_publish_final_exam(p_exam uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_course uuid; v_quiz uuid; v_question record; v_count integer;
begin
  select course_id, quiz_id into v_course, v_quiz from exams where id = p_exam and is_final;
  if v_course is null then raise exception 'Không tìm thấy kỳ thi cuối khóa'; end if;
  if not (fn_owns_course(v_course) or fn_is_admin()) then raise exception 'Bạn không có quyền đăng đề thi này'; end if;
  select count(*) into v_count from questions where quiz_id = v_quiz;
  if v_count = 0 then raise exception 'Cần thêm ít nhất một câu hỏi trước khi đăng đề'; end if;

  for v_question in select q.id, q.content from questions q where q.quiz_id = v_quiz loop
    if v_question.content not ilike '[Tự luận]%' then
      if (select count(*) from options where question_id = v_question.id) <> 4 then
        raise exception 'Mỗi câu trắc nghiệm phải có đủ 4 đáp án';
      end if;
      if not exists (select 1 from options where question_id = v_question.id and is_correct) then
        raise exception 'Mỗi câu trắc nghiệm phải có đáp án đúng';
      end if;
    end if;
  end loop;
  update exams set is_published = true where id = p_exam;
  update quizzes set is_published = true where id = v_quiz;
end $$;

create or replace function fn_get_quiz(p_quiz uuid)
returns table (
  quiz_id uuid, quiz_title text, pass_score integer, question_id uuid,
  question_text text, "position" integer, option_id uuid, option_text text
)
language plpgsql stable security definer set search_path = public as $$
declare v_course uuid; v_is_final boolean; v_published boolean;
begin
  v_course := fn_quiz_course(p_quiz);
  select is_final, coalesce(is_published, false) into v_is_final, v_published from quizzes where id = p_quiz;
  if v_is_final then
    if not v_published then raise exception 'Giảng viên chưa đăng kỳ thi cuối khóa'; end if;
    if not fn_is_enrolled(v_course) then raise exception 'Bạn chưa ghi danh khóa học này'; end if;
    if exists (select 1 from lessons l join chapters ch on ch.id = l.chapter_id where ch.course_id = v_course and not exists (select 1 from lesson_progress lp where lp.lesson_id = l.id and lp.user_id = auth.uid() and lp.is_completed)) then
      raise exception 'Bạn cần hoàn thành toàn bộ nội dung khóa học trước khi thi';
    end if;
  end if;
  return query select qz.id, qz.title, qz.pass_score, q.id, q.content, q.position, o.id, o.content
    from quizzes qz join questions q on q.quiz_id = qz.id join options o on o.question_id = q.id
    where qz.id = p_quiz order by q.position, o.id;
end $$;
