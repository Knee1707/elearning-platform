-- =====================================================================
-- 0003_commerce_learning.sql  ·  Chủ: LEADER (L) tạo bảng
--   · M2 làm nghiệp vụ học tập (0005)
-- Thương mại (cần courses → phải sau 0002) + Học tập/Đánh giá/Điểm danh.
-- =====================================================================

-- ================================================================== --
-- PHẦN A — THƯƠNG MẠI
-- ================================================================== --
create table enrollments (
  id           uuid              primary key default gen_random_uuid(),
  user_id      uuid              not null references profiles (id) on delete cascade,
  course_id    uuid              not null references courses (id) on delete cascade,
  status       enrollment_status not null default 'active',
  purchased_at timestamptz       not null default now(),
  unique (user_id, course_id)
);
create index idx_enrollments_user_id   on enrollments (user_id);
create index idx_enrollments_course_id on enrollments (course_id);

create table cart_item (
  id        uuid        primary key default gen_random_uuid(),
  user_id   uuid        not null references profiles (id) on delete cascade,
  course_id uuid        not null references courses (id) on delete cascade,
  added_at  timestamptz not null default now(),
  unique (user_id, course_id)
);
create index idx_cart_item_user_id on cart_item (user_id);

create table wishlist (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profiles (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  unique (user_id, course_id)
);
create index idx_wishlist_user_id on wishlist (user_id);

create table payments (
  id         uuid           primary key default gen_random_uuid(),
  user_id    uuid           not null references profiles (id) on delete cascade,
  course_id  uuid           not null references courses (id) on delete cascade,
  coupon_id  uuid           references coupon (id) on delete set null,
  amount     numeric(12,2)  not null check (amount >= 0),
  method     text           not null default 'mock',
  status     payment_status not null default 'paid',
  created_at timestamptz    not null default now()
);
create index idx_payments_user_id    on payments (user_id);
create index idx_payments_course_id  on payments (course_id);
create index idx_payments_created_at on payments (created_at desc);

create table refund (
  id          uuid          primary key default gen_random_uuid(),
  payment_id  uuid          not null references payments (id) on delete cascade,
  reason      text,
  status      refund_status not null default 'pending',
  created_at  timestamptz   not null default now(),
  resolved_at timestamptz
);
create index idx_refund_payment_id on refund (payment_id);

create table payout (
  id            uuid          primary key default gen_random_uuid(),
  instructor_id uuid          not null references profiles (id) on delete cascade,
  period        text          not null,          -- ví dụ '2026-08'
  gross         numeric(12,2) not null default 0,
  platform_fee  numeric(12,2) not null default 0,
  net           numeric(12,2) not null default 0,
  status        payout_status not null default 'draft',
  unique (instructor_id, period)
);
create index idx_payout_instructor_id on payout (instructor_id);

-- ================================================================== --
-- PHẦN B — HỌC TẬP · ĐÁNH GIÁ · TƯƠNG TÁC · ĐIỂM DANH
-- ================================================================== --
create table lesson_progress (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references profiles (id) on delete cascade,
  lesson_id             uuid        not null references lessons (id) on delete cascade,
  watched_percent       integer     not null default 0 check (watched_percent between 0 and 100),
  is_completed          boolean     not null default false,
  last_position_seconds integer     not null default 0 check (last_position_seconds >= 0),
  updated_at            timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index idx_lesson_progress_user_id on lesson_progress (user_id);

create table lesson_note (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references profiles (id) on delete cascade,
  lesson_id         uuid        not null references lessons (id) on delete cascade,
  timestamp_seconds integer     not null default 0 check (timestamp_seconds >= 0),
  content           text        not null,
  created_at        timestamptz not null default now()
);
create index idx_lesson_note_user_lesson on lesson_note (user_id, lesson_id);

create table qa_question (
  id         uuid        primary key default gen_random_uuid(),
  lesson_id  uuid        not null references lessons (id) on delete cascade,
  user_id    uuid        not null references profiles (id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now()
);
create index idx_qa_question_lesson_id on qa_question (lesson_id);

create table qa_answer (
  id          uuid        primary key default gen_random_uuid(),
  question_id uuid        not null references qa_question (id) on delete cascade,
  user_id     uuid        not null references profiles (id) on delete cascade,
  content     text        not null,
  created_at  timestamptz not null default now()
);
create index idx_qa_answer_question_id on qa_answer (question_id);

create table quizzes (
  id         uuid    primary key default gen_random_uuid(),
  lesson_id  uuid    not null references lessons (id) on delete cascade,
  title      text    not null,
  pass_score integer not null default 0 check (pass_score between 0 and 100)
);
create index idx_quizzes_lesson_id on quizzes (lesson_id);

create table questions (
  id       uuid    primary key default gen_random_uuid(),
  quiz_id  uuid    not null references quizzes (id) on delete cascade,
  content  text    not null,
  position integer not null default 0
);
create index idx_questions_quiz_id on questions (quiz_id);

create table options (
  id          uuid    primary key default gen_random_uuid(),
  question_id uuid    not null references questions (id) on delete cascade,
  content     text    not null,
  is_correct  boolean not null default false
);
create index idx_options_question_id on options (question_id);

create table exams (
  id                 uuid    primary key default gen_random_uuid(),
  course_id          uuid    not null references courses (id) on delete cascade,
  title              text    not null,
  time_limit_minutes integer not null default 30 check (time_limit_minutes > 0),
  pass_score         integer not null default 0 check (pass_score between 0 and 100)
);
create index idx_exams_course_id on exams (course_id);

create table exam_attempts (
  id           uuid        primary key default gen_random_uuid(),
  exam_id      uuid        not null references exams (id) on delete cascade,
  user_id      uuid        not null references profiles (id) on delete cascade,
  score        integer     check (score is null or score between 0 and 100),
  started_at   timestamptz not null default now(),
  submitted_at timestamptz
);
create index idx_exam_attempts_user_id on exam_attempts (user_id);
create index idx_exam_attempts_exam_id on exam_attempts (exam_id);

create table answers (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid not null references exam_attempts (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  option_id   uuid references options (id) on delete set null,
  unique (attempt_id, question_id)
);
create index idx_answers_attempt_id on answers (attempt_id);

create table certificates (
  id        uuid        primary key default gen_random_uuid(),
  user_id   uuid        not null references profiles (id) on delete cascade,
  course_id uuid        not null references courses (id) on delete cascade,
  code      text        not null unique,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index idx_certificates_user_id on certificates (user_id);

create table live_sessions (
  id           uuid        primary key default gen_random_uuid(),
  course_id    uuid        not null references courses (id) on delete cascade,
  title        text        not null,
  meet_url     text        not null,
  scheduled_at timestamptz,
  created_by   uuid        not null references profiles (id) on delete cascade
);
create index idx_live_sessions_course_id on live_sessions (course_id);

create table attendance (
  id              uuid              primary key default gen_random_uuid(),
  user_id         uuid              not null references profiles (id) on delete cascade,
  course_id       uuid              not null references courses (id) on delete cascade,
  source          attendance_source not null,
  lesson_id       uuid              references lessons (id) on delete cascade,
  live_session_id uuid              references live_sessions (id) on delete cascade,
  attended_at     timestamptz       not null default now(),
  -- điểm danh phải gắn đúng 1 nguồn
  constraint attendance_source_shape check (
    (source = 'video' and lesson_id is not null and live_session_id is null) or
    (source = 'live'  and live_session_id is not null and lesson_id is null)
  )
);
create index idx_attendance_course_id on attendance (course_id);
create index idx_attendance_user_id   on attendance (user_id);
-- CHỐNG TRÙNG: mỗi (user, nguồn, bài/buổi) chỉ 1 dòng.
-- Dùng coalesce để tránh bẫy "NULL luôn khác NULL" của UNIQUE index thường.
create unique index uq_attendance_once
  on attendance (user_id, source, coalesce(lesson_id, live_session_id));

create table notification (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles (id) on delete cascade,
  type       notif_type  not null,
  title      text        not null,
  body       text,
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);
create index idx_notification_user_unread on notification (user_id, is_read);

create table report (
  id          uuid          primary key default gen_random_uuid(),
  reporter_id uuid          not null references profiles (id) on delete cascade,
  entity      text          not null,   -- 'course' | 'review' | 'user' ...
  entity_id   uuid          not null,
  reason      text,
  status      report_status not null default 'open',
  created_at  timestamptz   not null default now()
);
create index idx_report_status on report (status);

-- ================================================================== --
-- PHẦN C — HÀM HỖ TRỢ RLS (cần các bảng vừa tạo)
-- ================================================================== --
create or replace function fn_is_enrolled(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e
    where e.course_id = cid and e.user_id = auth.uid() and e.status = 'active'
  )
$$;

create or replace function fn_owns_payment(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from payments p where p.id = pid and p.user_id = auth.uid())
$$;

-- Khóa cha của quiz / question / exam-attempt (để gác RLS theo "khóa nhìn thấy được")
create or replace function fn_quiz_course(qid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select fn_lesson_course((select lesson_id from quizzes where id = qid))
$$;

create or replace function fn_question_course(qid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select fn_quiz_course((select quiz_id from questions where id = qid))
$$;

-- ================================================================== --
-- PHẦN D — RLS
-- ================================================================== --
alter table enrollments     enable row level security;
alter table cart_item       enable row level security;
alter table wishlist        enable row level security;
alter table payments        enable row level security;
alter table refund          enable row level security;
alter table payout          enable row level security;
alter table lesson_progress enable row level security;
alter table lesson_note     enable row level security;
alter table qa_question     enable row level security;
alter table qa_answer       enable row level security;
alter table quizzes         enable row level security;
alter table questions       enable row level security;
alter table options         enable row level security;
alter table exams           enable row level security;
alter table exam_attempts   enable row level security;
alter table answers         enable row level security;
alter table certificates    enable row level security;
alter table live_sessions   enable row level security;
alter table attendance      enable row level security;
alter table notification    enable row level security;
alter table report          enable row level security;

-- Thương mại: mua/ghi danh/thanh toán chỉ tạo qua hàm security definer (0006).
create policy enrollments_select_own on enrollments
  for select using (user_id = auth.uid() or fn_is_admin());
create policy cart_item_own on cart_item
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wishlist_own on wishlist
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy payments_select_own on payments
  for select using (user_id = auth.uid() or fn_is_admin());
create policy refund_select_own on refund
  for select using (fn_owns_payment(payment_id) or fn_is_admin());
create policy refund_admin_update on refund
  for update using (fn_is_admin()) with check (fn_is_admin());
create policy payout_select_own on payout
  for select using (instructor_id = auth.uid() or fn_is_admin());

-- reviews INSERT: phải đã ghi danh (đặt ở đây vì cần fn_is_enrolled).
create policy reviews_insert_enrolled on reviews
  for insert with check (user_id = auth.uid() and fn_is_enrolled(course_id));

-- Học tập của chính mình.
create policy lesson_progress_select on lesson_progress
  for select using (user_id = auth.uid() or fn_is_admin());
create policy lesson_progress_write on lesson_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lesson_note_own on lesson_note
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Q&A: đọc nếu khóa nhìn thấy được; viết của mình.
create policy qa_question_select on qa_question
  for select using (fn_course_visible(fn_lesson_course(lesson_id)));
create policy qa_question_insert on qa_question
  for insert with check (user_id = auth.uid());
create policy qa_question_modify on qa_question
  for update using (user_id = auth.uid() or fn_is_admin())
             with check (user_id = auth.uid() or fn_is_admin());
create policy qa_question_delete on qa_question
  for delete using (user_id = auth.uid() or fn_is_admin());

create policy qa_answer_select on qa_answer
  for select using (fn_course_visible(fn_lesson_course(
    (select lesson_id from qa_question q where q.id = question_id))));
create policy qa_answer_insert on qa_answer
  for insert with check (user_id = auth.uid());
create policy qa_answer_modify on qa_answer
  for update using (user_id = auth.uid() or fn_is_admin())
             with check (user_id = auth.uid() or fn_is_admin());

-- Quiz / câu hỏi: đọc nếu khóa nhìn thấy được; ghi bởi chủ khóa / admin.
create policy quizzes_select on quizzes
  for select using (fn_course_visible(fn_lesson_course(lesson_id)));
create policy quizzes_write on quizzes
  for all using (fn_owns_course(fn_lesson_course(lesson_id)) or fn_is_admin())
          with check (fn_owns_course(fn_lesson_course(lesson_id)) or fn_is_admin());
create policy questions_select on questions
  for select using (fn_course_visible(fn_quiz_course(quiz_id)));
create policy questions_write on questions
  for all using (fn_owns_course(fn_quiz_course(quiz_id)) or fn_is_admin())
          with check (fn_owns_course(fn_quiz_course(quiz_id)) or fn_is_admin());

-- options: CHỐNG GIAN LẬN — chỉ CHỦ KHÓA / admin được đọc (vì có cột is_correct).
-- Học viên KHÔNG select trực tiếp; lấy đề qua hàm M2 (ẩn is_correct), chấm phía DB.
create policy options_owner_only on options
  for all using (fn_owns_course(fn_question_course(question_id)) or fn_is_admin())
          with check (fn_owns_course(fn_question_course(question_id)) or fn_is_admin());

-- Thi: đọc nếu khóa nhìn thấy được; ghi bởi chủ khóa / admin.
create policy exams_select on exams
  for select using (fn_course_visible(course_id));
create policy exams_write on exams
  for all using (fn_owns_course(course_id) or fn_is_admin())
          with check (fn_owns_course(course_id) or fn_is_admin());

-- Bài làm: của mình / admin. (Chấm điểm ghi qua hàm definer ở 0005.)
create policy exam_attempts_select on exam_attempts
  for select using (user_id = auth.uid() or fn_is_admin());
create policy exam_attempts_insert on exam_attempts
  for insert with check (user_id = auth.uid());
create policy answers_select on answers
  for select using (fn_is_admin() or exists (
    select 1 from exam_attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy answers_insert on answers
  for insert with check (exists (
    select 1 from exam_attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- Chứng chỉ: chủ đọc / admin. Cấp qua trigger definer (0005). Tra công khai qua fn_verify_certificate.
create policy certificates_select_own on certificates
  for select using (user_id = auth.uid() or fn_is_admin());

-- Buổi live: đọc nếu khóa nhìn thấy được; ghi bởi chủ khóa / admin.
create policy live_sessions_select on live_sessions
  for select using (fn_course_visible(course_id));
create policy live_sessions_write on live_sessions
  for all using (fn_owns_course(course_id) or fn_is_admin())
          with check (fn_owns_course(course_id) or fn_is_admin());

-- Điểm danh: chủ đọc / admin. Ghi qua trigger + hàm definer (0005).
create policy attendance_select_own on attendance
  for select using (user_id = auth.uid() or fn_is_admin());

-- Thông báo: chủ đọc + đánh dấu đã đọc.
create policy notification_select_own on notification
  for select using (user_id = auth.uid());
create policy notification_update_own on notification
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Báo cáo vi phạm: ai đăng nhập cũng gửi được; chủ/admin đọc; admin xử lý.
create policy report_insert on report
  for insert with check (reporter_id = auth.uid());
create policy report_select on report
  for select using (reporter_id = auth.uid() or fn_is_admin());
create policy report_update_admin on report
  for update using (fn_is_admin()) with check (fn_is_admin());

-- ================================================================== --
-- PHẦN E — CHỮ KÝ HÀM/VIEW ĐỂ M1 & M2 ĐIỀN THÂN
-- (KHÔNG tạo thân ở đây để tránh bịa; M1/M2 CREATE ở 0004/0005.
--  Liệt kê signature làm hợp đồng — app gọi đúng các tên này.)
-- ------------------------------------------------------------------ --
-- M1 (0004_content_logic.sql):
--   view  view_course_catalog        (khóa published + sao TB + is_featured)
--   fn    fn_search_courses(p_keyword text, p_category uuid, p_level text, p_max_price numeric, p_min_rating numeric)
--   view  view_course_detail
--   view  view_course_rating
--   view  view_instructor_stats
--   fn    fn_apply_coupon(p_code text, p_course_ids uuid[]) returns numeric   -- giá sau giảm
--
-- M2 (0005_learning_logic.sql):
--   fn    fn_update_watch(p_lesson uuid, p_percent int)
--   fn    fn_save_position(p_lesson uuid, p_seconds int)
--   fn    fn_mark_complete(p_lesson uuid)
--   view  view_course_progress
--   fn    fn_get_quiz(p_quiz uuid)                  -- trả câu hỏi + đáp án KHÔNG kèm is_correct
--   fn    fn_submit_attempt(p_exam uuid, p_answers jsonb) returns int   -- chấm phía DB
--   trg   trg_issue_certificate                     -- cấp khi đạt
--   fn    fn_verify_certificate(p_code text)        -- tra công khai
--   trg   trg_attendance_on_video                   -- % >= ngưỡng → attendance(video)
--   fn    fn_join_live_session(p_live uuid) returns text   -- ghi attendance(live) + trả meet_url
--   view  view_attendance
--   fn    fn_add_note(p_lesson uuid, p_seconds int, p_content text)
--   fn    fn_ask_question(p_lesson uuid, p_content text)
--   fn    fn_answer_question(p_question uuid, p_content text)
--   fn    fn_mark_read(p_notification uuid)
