-- =====================================================================
-- seed.sql  ·  Chạy sau migrations (supabase db reset)
-- Chia 3 phần: L (cấu hình) · M1 (nội dung) · M2 (học tập).
-- Mỗi người CHỈ điền phần của mình, không đụng phần người khác.
-- =====================================================================

-- ============================ L — CẤU HÌNH ========================== --
-- system_setting: key là PK not-null → on conflict do nothing an toàn.
insert into system_setting (key, value) values
  ('platform_fee_percent',       '20'::jsonb),   -- % nền tảng giữ lại khi payout
  ('attendance_video_percent',   '95'::jsonb),   -- ngưỡng % xem video để tự điểm danh
  ('default_exam_pass_score',    '50'::jsonb),   -- điểm đạt mặc định
  ('currency',                   '"VND"'::jsonb)
on conflict (key) do nothing;

-- LƯU Ý: tài khoản admin KHÔNG seed bằng SQL (mật khẩu do Supabase Auth quản lý).
-- Cách tạo admin:
--   1) Đăng ký 1 user qua app (hoặc Supabase Studio › Authentication › Add user).
--   2) Chạy: update profiles set role = 'admin' where id = '<uuid user đó>';
-- (Trigger trg_profile_on_signup đã tự tạo dòng profiles khi user đăng ký.)


-- ============================ M1 — NỘI DUNG ========================= --
-- TODO (M1): categories + tag + 3–5 khóa × chương × bài + attachments
--            + 2 coupon (1 percent, 1 fixed) + vài review mẫu.
-- Gợi ý idempotent: insert ... select ... where not exists (...).


-- ======================= M2 — HỌC TẬP / ĐIỂM DANH =================== --
-- Chủ: M2. Dữ liệu mẫu đủ demo trọn luồng:
--   enrollment → progress (rải rác) → quiz + attempt
--   → exam + attempt đạt → certificate
--   → live_session + attendance (cả video lẫn live)
--   → qa_question / qa_answer + lesson_note
-- Dùng DO $$ ... END $$ để lấy ID sinh ra mà không cần hard-code.
-- Idempotent: dùng on conflict ... do nothing.
-- =====================================================================

do $$
declare
  -- ── Người dùng mẫu (phải tồn tại trong auth.users trước) ──────────
  -- Ghi chú: trong môi trường dev, tạo user qua Supabase Studio
  -- hoặc supabase CLI. Đây là UUID placeholder — thay bằng UUID thật
  -- khi chạy thực tế.
  v_instructor_id uuid := '00000000-0000-0000-0000-000000000001';
  v_student1_id   uuid := '00000000-0000-0000-0000-000000000002';
  v_student2_id   uuid := '00000000-0000-0000-0000-000000000003';

  -- ── Nội dung (sẽ được M1 điền UUID thật; đây là placeholder) ──────
  v_cat_id        uuid;
  v_course1_id    uuid;
  v_course2_id    uuid;
  v_ch1_id        uuid;    -- chương 1 của course1
  v_ch2_id        uuid;    -- chương 2 của course1
  v_lesson1_id    uuid;    -- bài 1-1
  v_lesson2_id    uuid;    -- bài 1-2
  v_lesson3_id    uuid;    -- bài 2-1
  v_lesson4_id    uuid;    -- bài 2-2

  -- ── M2: IDs tạo ra ──────────────────────────────────────────────
  v_quiz1_id      uuid;
  v_q1_id         uuid;    -- câu hỏi 1
  v_q2_id         uuid;    -- câu hỏi 2
  v_opt1a_id      uuid;    -- đáp án đúng Q1
  v_opt1b_id      uuid;    -- đáp án sai Q1
  v_opt2a_id      uuid;    -- đáp án đúng Q2
  v_opt2b_id      uuid;    -- đáp án sai Q2

  v_exam1_id      uuid;
  v_eq1_id        uuid;    -- câu hỏi thi 1
  v_eq2_id        uuid;    -- câu hỏi thi 2
  v_eo1a_id       uuid;    -- đáp án đúng EQ1
  v_eo1b_id       uuid;    -- đáp án sai EQ1
  v_eo2a_id       uuid;    -- đáp án đúng EQ2
  v_eo2b_id       uuid;    -- đáp án sai EQ2
  v_attempt1_id   uuid;

  v_live1_id      uuid;
  v_live2_id      uuid;
  v_qa1_id        uuid;    -- câu hỏi Q&A
begin

  -- ================================================================
  -- 0. Tạo auth.users trước (profiles.id là FK tới auth.users.id)
  --    Supabase local seed cho phép insert thẳng vào auth.users.
  --    Mật khẩu hash = bcrypt("Password123!") — dùng để test thủ công.
  -- ================================================================
  insert into auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values
    (
      v_instructor_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'gv@demo.local',
      '$2a$10$PgjZCpqtCPMOkHKiV3X7B.sJgDLV6Wh.3u2i7Dg5f5M3IqJ5YuGe',
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Nguyễn Văn Giảng Viên"}'::jsonb,
      false, '', '', '', ''
    ),
    (
      v_student1_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'hva@demo.local',
      '$2a$10$PgjZCpqtCPMOkHKiV3X7B.sJgDLV6Wh.3u2i7Dg5f5M3IqJ5YuGe',
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Trần Thị Học Viên A"}'::jsonb,
      false, '', '', '', ''
    ),
    (
      v_student2_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'hvb@demo.local',
      '$2a$10$PgjZCpqtCPMOkHKiV3X7B.sJgDLV6Wh.3u2i7Dg5f5M3IqJ5YuGe',
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Lê Văn Học Viên B"}'::jsonb,
      false, '', '', '', ''
    )
  on conflict (id) do nothing;

  -- ================================================================
  -- 0b. Tạo profiles mẫu (trigger trg_profile_on_signup đã tự tạo
  --     khi insert auth.users ở trên, nhưng dùng on conflict để chắc)
  -- ================================================================
  insert into profiles (id, full_name, role) values
    (v_instructor_id, 'Nguyễn Văn Giảng Viên', 'instructor'),
    (v_student1_id,   'Trần Thị Học Viên A',   'student'),
    (v_student2_id,   'Lê Văn Học Viên B',      'student')
  on conflict (id) do update set
    full_name = excluded.full_name,
    role      = excluded.role;

  -- ================================================================
  -- 1. Tạo danh mục + khóa học mẫu (M1 thay bằng seed thật)
  -- ================================================================
  insert into categories (id, name, slug) values
    ('10000000-0000-0000-0000-000000000001', 'Lập trình Web', 'lap-trinh-web')
  on conflict do nothing;
  v_cat_id := '10000000-0000-0000-0000-000000000001';

  insert into courses (id, instructor_id, category_id, title, slug, description,
                       level, price, status, is_featured) values
    ('20000000-0000-0000-0000-000000000001',
     v_instructor_id, v_cat_id,
     'Khóa học Next.js từ cơ bản đến nâng cao',
     'nextjs-co-ban-nang-cao',
     'Học Next.js App Router, Supabase, TypeScript toàn diện.',
     'beginner', 990000, 'published', true),
    ('20000000-0000-0000-0000-000000000002',
     v_instructor_id, v_cat_id,
     'React và TypeScript cho người mới',
     'react-typescript-nguoi-moi',
     'Nền tảng React + TypeScript vững chắc cho người bắt đầu.',
     'beginner', 790000, 'published', false)
  on conflict do nothing;

  v_course1_id := '20000000-0000-0000-0000-000000000001';
  v_course2_id := '20000000-0000-0000-0000-000000000002';

  -- Chương
  insert into chapters (id, course_id, title, position) values
    ('30000000-0000-0000-0000-000000000001', v_course1_id, 'Chương 1: Giới thiệu Next.js', 1),
    ('30000000-0000-0000-0000-000000000002', v_course1_id, 'Chương 2: App Router nâng cao', 2)
  on conflict do nothing;

  v_ch1_id := '30000000-0000-0000-0000-000000000001';
  v_ch2_id := '30000000-0000-0000-0000-000000000002';

  -- Bài học
  insert into lessons (id, chapter_id, title, video_url, duration_seconds, is_free, position) values
    ('40000000-0000-0000-0000-000000000001', v_ch1_id, 'Bài 1: Cài đặt và Hello World',
     'https://example.com/videos/nextjs-01', 600, true, 1),
    ('40000000-0000-0000-0000-000000000002', v_ch1_id, 'Bài 2: Cấu trúc thư mục App Router',
     'https://example.com/videos/nextjs-02', 900, false, 2),
    ('40000000-0000-0000-0000-000000000003', v_ch2_id, 'Bài 3: Server Components',
     'https://example.com/videos/nextjs-03', 720, false, 1),
    ('40000000-0000-0000-0000-000000000004', v_ch2_id, 'Bài 4: Data Fetching & Caching',
     'https://example.com/videos/nextjs-04', 840, false, 2)
  on conflict do nothing;

  v_lesson1_id := '40000000-0000-0000-0000-000000000001';
  v_lesson2_id := '40000000-0000-0000-0000-000000000002';
  v_lesson3_id := '40000000-0000-0000-0000-000000000003';
  v_lesson4_id := '40000000-0000-0000-0000-000000000004';

  -- ================================================================
  -- 2. Enrollment — ghi danh học viên vào khóa học
  -- ================================================================
  insert into enrollments (user_id, course_id, status) values
    (v_student1_id, v_course1_id, 'active'),
    (v_student2_id, v_course1_id, 'active'),
    (v_student1_id, v_course2_id, 'active')
  on conflict (user_id, course_id) do nothing;

  -- ================================================================
  -- 3. Tiến độ học — lesson_progress (rải rác: có bài xong, bài dở)
  -- ================================================================
  insert into lesson_progress (user_id, lesson_id, watched_percent, is_completed, last_position_seconds) values
    -- Student1: bài 1 xong, bài 2 dở 60%, bài 3 xong (đủ 95% trigger điểm danh)
    (v_student1_id, v_lesson1_id, 100, true,  600),
    (v_student1_id, v_lesson2_id,  60, false,  540),
    (v_student1_id, v_lesson3_id,  97, true,  720),  -- 97% >= 95 → sẽ trigger điểm danh video
    -- Student2: chỉ xem bài 1 được 40%
    (v_student2_id, v_lesson1_id,  40, false,  240)
  on conflict (user_id, lesson_id) do update
    set watched_percent = excluded.watched_percent,
        is_completed = excluded.is_completed,
        last_position_seconds = excluded.last_position_seconds,
        updated_at = now();

  -- Điểm danh video thủ công cho student1/bài3 (trigger sẽ tự làm trong runtime;
  -- để seed có dữ liệu mẫu ngay, chèn trực tiếp vào attendance)
  insert into attendance (user_id, course_id, source, lesson_id) values
    (v_student1_id, v_course1_id, 'video', v_lesson1_id),
    (v_student1_id, v_course1_id, 'video', v_lesson3_id)
  on conflict do nothing;

  -- ================================================================
  -- 4. Quiz sau bài học — quizzes + questions + options
  -- ================================================================
  insert into quizzes (id, lesson_id, title, pass_score) values
    ('50000000-0000-0000-0000-000000000001', v_lesson2_id, 'Quiz: App Router cơ bản', 60)
  on conflict do nothing;
  v_quiz1_id := '50000000-0000-0000-0000-000000000001';

  -- Câu hỏi 1
  insert into questions (id, quiz_id, content, position) values
    ('51000000-0000-0000-0000-000000000001', v_quiz1_id, 'App Router lưu route ở thư mục nào?', 1),
    ('51000000-0000-0000-0000-000000000002', v_quiz1_id, 'File nào là entry point của một route?', 2)
  on conflict do nothing;

  v_q1_id := '51000000-0000-0000-0000-000000000001';
  v_q2_id := '51000000-0000-0000-0000-000000000002';

  -- Đáp án câu 1
  insert into options (id, question_id, content, is_correct) values
    ('52000000-0000-0000-0000-000000000001', v_q1_id, 'app/',       true),   -- đúng
    ('52000000-0000-0000-0000-000000000002', v_q1_id, 'pages/',     false),
    ('52000000-0000-0000-0000-000000000003', v_q1_id, 'routes/',    false),
    ('52000000-0000-0000-0000-000000000004', v_q1_id, 'src/views/', false)
  on conflict do nothing;

  -- Đáp án câu 2
  insert into options (id, question_id, content, is_correct) values
    ('52000000-0000-0000-0000-000000000005', v_q2_id, 'page.tsx',   true),   -- đúng
    ('52000000-0000-0000-0000-000000000006', v_q2_id, 'index.tsx',  false),
    ('52000000-0000-0000-0000-000000000007', v_q2_id, 'layout.tsx', false),
    ('52000000-0000-0000-0000-000000000008', v_q2_id, 'route.tsx',  false)
  on conflict do nothing;

  v_opt1a_id := '52000000-0000-0000-0000-000000000001';
  v_opt2a_id := '52000000-0000-0000-0000-000000000005';

  -- ================================================================
  -- 5. Đề thi cuối khóa — exams + câu hỏi thi
  -- ================================================================
  insert into exams (id, course_id, title, time_limit_minutes, pass_score) values
    ('60000000-0000-0000-0000-000000000001', v_course1_id,
     'Kỳ thi cuối khóa Next.js', 45, 70)
  on conflict do nothing;
  v_exam1_id := '60000000-0000-0000-0000-000000000001';

  -- Đề thi dùng câu hỏi từ 1 quiz riêng gắn với bài 4 (bài cuối khóa)
  -- questions.quiz_id NOT NULL → phải thuộc 1 quiz hợp lệ
  insert into quizzes (id, lesson_id, title, pass_score) values
    ('50000000-0000-0000-0000-000000000002', v_lesson4_id, 'Quiz: Đề thi cuối khóa Next.js', 70)
  on conflict do nothing;

  insert into questions (id, quiz_id, content, position) values
    ('61000000-0000-0000-0000-000000000001',
     '50000000-0000-0000-0000-000000000002',
     'Server Component mang lại lợi ích gì?', 1),
    ('61000000-0000-0000-0000-000000000002',
     '50000000-0000-0000-0000-000000000002',
     'Caching trong Next.js 14 dùng API nào?', 2)
  on conflict do nothing;

  v_eq1_id := '61000000-0000-0000-0000-000000000001';
  v_eq2_id := '61000000-0000-0000-0000-000000000002';

  insert into options (id, question_id, content, is_correct) values
    ('62000000-0000-0000-0000-000000000001', v_eq1_id, 'Giảm JS bundle phía client', true),
    ('62000000-0000-0000-0000-000000000002', v_eq1_id, 'Tốc độ gõ code nhanh hơn',  false),
    ('62000000-0000-0000-0000-000000000003', v_eq2_id, 'fetch() với cache options',  true),
    ('62000000-0000-0000-0000-000000000004', v_eq2_id, 'localStorage API',           false)
  on conflict do nothing;

  v_eo1a_id := '62000000-0000-0000-0000-000000000001';
  v_eo2a_id := '62000000-0000-0000-0000-000000000003';

  -- ================================================================
  -- 6. Lần thi (attempt) đạt điểm → trigger cấp chứng chỉ tự động
  --    (score >= pass_score=70 → trigger trg_issue_certificate chạy)
  -- ================================================================
  insert into exam_attempts (id, exam_id, user_id, score, started_at, submitted_at) values
    ('70000000-0000-0000-0000-000000000001',
     v_exam1_id, v_student1_id, 100,
     now() - interval '2 hours',
     now() - interval '1 hour')
  on conflict do nothing;
  v_attempt1_id := '70000000-0000-0000-0000-000000000001';

  -- Ghi bài làm chi tiết
  insert into answers (attempt_id, question_id, option_id) values
    (v_attempt1_id, v_eq1_id, v_eo1a_id),
    (v_attempt1_id, v_eq2_id, v_eo2a_id)
  on conflict (attempt_id, question_id) do nothing;

  -- Cấp chứng chỉ thủ công cho seed (trigger tự làm khi runtime;
  -- seed trực tiếp để có dữ liệu mẫu ngay)
  insert into certificates (user_id, course_id, code, issued_at) values
    (v_student1_id, v_course1_id, 'CERT-NEXTJS-2026-A1B2C3D4', now() - interval '30 minutes')
  on conflict (user_id, course_id) do nothing;

  -- ================================================================
  -- 7. Buổi học trực tiếp (live_sessions) + điểm danh live
  -- ================================================================
  insert into live_sessions (id, course_id, title, meet_url, scheduled_at, created_by) values
    ('80000000-0000-0000-0000-000000000001',
     v_course1_id,
     'Buổi Q&A trực tiếp #1 — Server Components',
     'https://meet.google.com/abc-def-ghi',
     now() + interval '3 days',
     v_instructor_id),
    ('80000000-0000-0000-0000-000000000002',
     v_course1_id,
     'Buổi Q&A trực tiếp #2 — Deploy & DevOps',
     'https://meet.google.com/jkl-mno-pqr',
     now() + interval '10 days',
     v_instructor_id)
  on conflict do nothing;

  v_live1_id := '80000000-0000-0000-0000-000000000001';
  v_live2_id := '80000000-0000-0000-0000-000000000002';

  -- Điểm danh live — student1 đã bấm "Vào học trực tiếp"
  insert into attendance (user_id, course_id, source, live_session_id) values
    (v_student1_id, v_course1_id, 'live', v_live1_id)
  on conflict do nothing;

  -- ================================================================
  -- 8. Q&A dưới bài học
  -- ================================================================
  insert into qa_question (id, lesson_id, user_id, content) values
    ('90000000-0000-0000-0000-000000000001',
     v_lesson3_id, v_student1_id,
     'Tại sao Server Component không thể dùng useState?')
  on conflict do nothing;
  v_qa1_id := '90000000-0000-0000-0000-000000000001';

  insert into qa_answer (question_id, user_id, content) values
    (v_qa1_id, v_instructor_id,
     'Vì useState là client-side state, cần "use client" directive. '
     || 'Server Components không có lifecycle phía browser nên không thể giữ state.')
  on conflict do nothing;

  -- Câu hỏi thứ 2 (chưa được trả lời — để demo trạng thái pending)
  insert into qa_question (id, lesson_id, user_id, content) values
    ('90000000-0000-0000-0000-000000000002',
     v_lesson3_id, v_student2_id,
     'Có thể dùng Zustand trong Server Component không?')
  on conflict do nothing;

  -- ================================================================
  -- 9. Ghi chú theo mốc video (lesson_note)
  -- ================================================================
  insert into lesson_note (user_id, lesson_id, timestamp_seconds, content) values
    (v_student1_id, v_lesson1_id,  45, 'Nhớ cài pnpm thay vì npm để nhanh hơn'),
    (v_student1_id, v_lesson2_id, 120, 'App Router dùng file-system routing — gọn hơn Pages Router'),
    (v_student1_id, v_lesson3_id, 300, 'Server Component: fetch data trực tiếp không cần useEffect!')
  on conflict do nothing;

  -- ================================================================
  -- 10. Thông báo mẫu
  -- ================================================================
  insert into notification (user_id, type, title, body, is_read) values
    (v_student1_id, 'purchase', 'Mua khóa thành công',
     'Đã mở khóa: Khóa học Next.js từ cơ bản đến nâng cao', true),
    (v_student1_id, 'system', 'Chúc mừng! Bạn đã đạt chứng chỉ',
     'Mã chứng chỉ: CERT-NEXTJS-2026-A1B2C3D4', false),
    (v_student1_id, 'reply', 'Câu hỏi của bạn đã được trả lời',
     'Vì useState là client-side state, cần "use client" directive...', false)
  on conflict do nothing;

end $$;


-- ================================================================== --
-- QUERY MẪU MINH HỌA NGHIỆP VỤ M2 (kèm kết quả dự kiến)
-- Chạy từng câu để kiểm tra sau khi seed xong.
-- ================================================================== --

-- Q1. Tiến độ trung bình mỗi khóa (tất cả học viên)
-- select
--   c.title          as course_title,
--   count(distinct e.user_id)   as enrolled_students,
--   round(avg(lp_agg.pct), 1)   as avg_progress_pct
-- from courses c
-- join enrollments e on e.course_id = c.id and e.status = 'active'
-- left join lateral (
--   select coalesce(avg(lp.watched_percent), 0) as pct
--   from chapters ch
--   join lessons l  on l.chapter_id = ch.id
--   left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = e.user_id
--   where ch.course_id = c.id
-- ) lp_agg on true
-- group by c.id, c.title
-- order by avg_progress_pct desc;

-- Q2. Danh sách HV đã đạt chứng chỉ
-- select
--   p.full_name       as student_name,
--   c.title           as course_title,
--   cert.code         as certificate_code,
--   cert.issued_at
-- from certificates cert
-- join profiles p  on p.id  = cert.user_id
-- join courses  c  on c.id  = cert.course_id
-- order by cert.issued_at desc;

-- Q3. Báo cáo điểm danh 1 lớp (video + live)
-- select
--   p.full_name  as student_name,
--   a.source,
--   coalesce(l.title, ls.title) as session_title,
--   a.attended_at
-- from attendance a
-- join profiles p on p.id = a.user_id
-- left join lessons      l  on l.id  = a.lesson_id
-- left join live_sessions ls on ls.id = a.live_session_id
-- where a.course_id = '20000000-0000-0000-0000-000000000001'
-- order by a.attended_at;
