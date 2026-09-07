-- =====================================================================
-- check-m2-live.sql — Kiểm tra ĐỘNG (chạy trên Supabase Studio)
-- Chủ: M2. Chạy SAU khi đã apply migrations + seed.
--
-- Cách dùng:
--   Supabase Studio → SQL Editor → paste toàn bộ file này → Run
--
-- Mỗi SELECT bên dưới là 1 bài kiểm tra riêng.
-- Chạy TỪNG KHỐI một (chọn rồi bấm Run) để xem kết quả rõ hơn.
-- =====================================================================


-- ══════════════════════════════════════════════════════════════════
-- MỤC 1: Kiểm tra hàm (functions) tồn tại trong DB
-- Cột status phải đều là "✓ EXISTS"
-- ══════════════════════════════════════════════════════════════════
select
  needed.fn_name                                           as "Hàm",
  case when p.proname is not null then '✓ EXISTS'
       else '✗ MISSING — Chạy lại migration 0005!'
  end                                                      as "Trạng thái"
from (values
  ('fn_update_watch'),
  ('fn_save_position'),
  ('fn_mark_complete'),
  ('fn_get_quiz'),
  ('fn_submit_attempt'),
  ('fn_verify_certificate'),
  ('fn_join_live_session'),
  ('fn_add_note'),
  ('fn_ask_question'),
  ('fn_answer_question'),
  ('fn_mark_read'),
  ('fn_issue_certificate'),
  ('fn_attendance_on_video'),
  ('fn_notify_on_answer')
) as needed(fn_name)
left join pg_proc p
  on p.proname = needed.fn_name
  and p.pronamespace = 'public'::regnamespace
order by needed.fn_name;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 2: Kiểm tra trigger tồn tại
-- ══════════════════════════════════════════════════════════════════
select
  needed.trg_name                                          as "Trigger",
  needed.tbl                                               as "Trên bảng",
  case when t.tgname is not null then '✓ EXISTS'
       else '✗ MISSING'
  end                                                      as "Trạng thái"
from (values
  ('trg_issue_certificate',   'exam_attempts'),
  ('trg_attendance_on_video', 'lesson_progress'),
  ('trg_notify_on_answer',    'qa_answer')
) as needed(trg_name, tbl)
left join pg_trigger t on t.tgname = needed.trg_name
order by needed.trg_name;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 3: Kiểm tra view tồn tại
-- ══════════════════════════════════════════════════════════════════
select
  needed.view_name                                         as "View",
  case when v.viewname is not null then '✓ EXISTS'
       else '✗ MISSING'
  end                                                      as "Trạng thái"
from (values
  ('view_course_progress'),
  ('view_attendance'),
  ('view_certificate')
) as needed(view_name)
left join pg_views v
  on v.viewname = needed.view_name
  and v.schemaname = 'public'
order by needed.view_name;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 4: Kiểm tra bảng M2 tồn tại (từ 0003)
-- ══════════════════════════════════════════════════════════════════
select
  needed.tbl                                               as "Bảng",
  case when t.tablename is not null then '✓ EXISTS'
       else '✗ MISSING — Chạy lại migration 0003!'
  end                                                      as "Trạng thái"
from (values
  ('lesson_progress'), ('lesson_note'),
  ('qa_question'),     ('qa_answer'),
  ('quizzes'),         ('questions'), ('options'),
  ('exams'),           ('exam_attempts'), ('answers'),
  ('certificates'),    ('live_sessions'), ('attendance'),
  ('notification'),    ('report')
) as needed(tbl)
left join pg_tables t
  on t.tablename = needed.tbl
  and t.schemaname = 'public'
order by needed.tbl;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 5: Kiểm tra seed data — đếm số bản ghi mỗi bảng M2
-- Tất cả bảng phải có count > 0
-- ══════════════════════════════════════════════════════════════════
select 'enrollments'     as "Bảng", count(*) as "Số bản ghi" from enrollments
union all
select 'lesson_progress',            count(*) from lesson_progress
union all
select 'quizzes',                    count(*) from quizzes
union all
select 'questions',                  count(*) from questions
union all
select 'options',                    count(*) from options
union all
select 'exams',                      count(*) from exams
union all
select 'exam_attempts',              count(*) from exam_attempts
union all
select 'answers',                    count(*) from answers
union all
select 'certificates',               count(*) from certificates
union all
select 'live_sessions',              count(*) from live_sessions
union all
select 'attendance',                 count(*) from attendance
union all
select 'qa_question',                count(*) from qa_question
union all
select 'qa_answer',                  count(*) from qa_answer
union all
select 'lesson_note',                count(*) from lesson_note
union all
select 'notification',               count(*) from notification
order by "Bảng";


-- ══════════════════════════════════════════════════════════════════
-- MỤC 6: Kiểm tra điểm danh TỰ ĐỘNG — 2 nguồn video + live
-- Phải có cả source='video' và source='live'
-- ══════════════════════════════════════════════════════════════════
select
  source                                                   as "Nguồn điểm danh",
  count(*)                                                 as "Số lượt"
from attendance
group by source
order by source;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 7: Test fn_verify_certificate (tra mã chứng chỉ)
-- Phải trả về 1 dòng với tên học viên và tên khóa học
-- ══════════════════════════════════════════════════════════════════
select
  certificate_code    as "Mã chứng chỉ",
  student_name        as "Tên học viên",
  course_title        as "Tên khóa học",
  issued_at           as "Ngày cấp"
from fn_verify_certificate('CERT-NEXTJS-2026-A1B2C3D4');


-- ══════════════════════════════════════════════════════════════════
-- MỤC 8: Test view_certificate — danh sách chứng chỉ
-- ══════════════════════════════════════════════════════════════════
select
  code                as "Mã",
  student_name        as "Học viên",
  course_title        as "Khóa học",
  instructor_name     as "Giảng viên",
  issued_at           as "Ngày cấp"
from view_certificate;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 9: Test view_attendance — báo cáo điểm danh
-- ══════════════════════════════════════════════════════════════════
select
  student_name        as "Học viên",
  course_title        as "Khóa học",
  source              as "Nguồn",
  coalesce(lesson_title, live_session_title) as "Buổi học",
  attended_at         as "Thời gian"
from view_attendance
order by attended_at;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 10: Test fn_get_quiz — kiểm tra KHÔNG lộ đáp án đúng
-- Kết quả KHÔNG được có cột is_correct
-- ══════════════════════════════════════════════════════════════════
select
  quiz_title          as "Quiz",
  question_text       as "Câu hỏi",
  "position"          as "Thứ tự",
  option_text         as "Đáp án"
from fn_get_quiz('50000000-0000-0000-0000-000000000001')
order by "position", option_id;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 11: Kiểm tra ngưỡng điểm danh video từ system_setting
-- Phải trả về 95 (hoặc giá trị bạn đã cấu hình)
-- ══════════════════════════════════════════════════════════════════
select
  key                 as "Cài đặt",
  value               as "Giá trị"
from system_setting
where key = 'attendance_video_percent';


-- ══════════════════════════════════════════════════════════════════
-- MỤC 12: Query mẫu — Tiến độ học tập trung bình theo khóa
-- (Yêu cầu mục 9.5 PHAN_CONG.md)
-- ══════════════════════════════════════════════════════════════════
select
  c.title                                                  as "Khóa học",
  count(distinct e.user_id)                                as "Số học viên",
  coalesce(round(avg(lp.watched_percent), 1), 0)           as "% xem TB",
  count(lp.id) filter (where lp.is_completed = true)       as "Bài đã hoàn thành"
from courses c
join enrollments e     on e.course_id = c.id and e.status = 'active'
join chapters ch       on ch.course_id = c.id
join lessons l         on l.chapter_id = ch.id
left join lesson_progress lp on lp.lesson_id = l.id
group by c.id, c.title
order by "Số học viên" desc;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 13: Query mẫu — Học viên đã đạt chứng chỉ
-- ══════════════════════════════════════════════════════════════════
select
  p.full_name         as "Học viên",
  c.title             as "Khóa học",
  cert.code           as "Mã chứng chỉ",
  cert.issued_at      as "Ngày cấp"
from certificates cert
join profiles p  on p.id  = cert.user_id
join courses  c  on c.id  = cert.course_id
order by cert.issued_at desc;


-- ══════════════════════════════════════════════════════════════════
-- MỤC 14: Query mẫu — Báo cáo điểm danh lớp
-- ══════════════════════════════════════════════════════════════════
select
  p.full_name                                              as "Học viên",
  a.source                                                 as "Nguồn",
  coalesce(l.title, ls.title)                              as "Buổi học",
  a.attended_at                                            as "Thời gian điểm danh"
from attendance a
join profiles      p   on p.id  = a.user_id
left join lessons  l   on l.id  = a.lesson_id
left join live_sessions ls on ls.id = a.live_session_id
order by a.course_id, a.attended_at;
