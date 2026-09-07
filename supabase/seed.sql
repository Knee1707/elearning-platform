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
-- Categories và tags không phụ thuộc tài khoản Auth.
insert into categories (name, slug)
select source.name, source.slug
from (values
  ('Lập trình Web', 'lap-trinh-web'),
  ('Dữ liệu và AI', 'du-lieu-va-ai'),
  ('Kỹ năng nghề nghiệp', 'ky-nang-nghe-nghiep')
) as source(name, slug)
where not exists (
  select 1 from categories existing where existing.slug = source.slug
);

insert into tag (name, slug)
select source.name, source.slug
from (values
  ('TypeScript', 'typescript'),
  ('React', 'react'),
  ('Next.js', 'nextjs'),
  ('Python', 'python'),
  ('SQL', 'sql'),
  ('Thực hành', 'thuc-hanh')
) as source(name, slug)
where not exists (
  select 1 from tag existing where existing.slug = source.slug
);

-- Courses cần instructor đã được tạo qua Supabase Auth và trigger profile.
-- Nếu database chưa có instructor, các block phụ thuộc sẽ tự bỏ qua.
insert into courses (
  instructor_id, category_id, title, slug, description, level, price,
  status, thumbnail_url, is_featured
)
select instructor.id, category.id, source.title, source.slug, source.description,
       source.level, source.price, source.status::course_status,
       source.thumbnail_url, source.is_featured
from (values
  ('Xây dựng ứng dụng Next.js thực chiến', 'nextjs-thuc-chien',
   'Từ React đến một ứng dụng Next.js hoàn chỉnh với App Router.', 'intermediate',
   899000::numeric, 'published', '/courses/nextjs.svg', true,
   'lap-trinh-web'),
  ('TypeScript nền tảng đến nâng cao', 'typescript-nen-tang',
   'Nắm vững type system và các kỹ thuật TypeScript trong dự án thực tế.', 'beginner',
   499000::numeric, 'published', '/courses/typescript.svg', false,
   'lap-trinh-web'),
  ('Phân tích dữ liệu với Python', 'phan-tich-du-lieu-python',
   'Làm quen với quy trình làm sạch, phân tích và trực quan hóa dữ liệu.', 'beginner',
   699000::numeric, 'published', '/courses/python-data.svg', true,
   'du-lieu-va-ai'),
  ('SQL cho người làm sản phẩm', 'sql-cho-nguoi-lam-san-pham',
   'Đọc dữ liệu sản phẩm bằng các truy vấn SQL rõ ràng và đáng tin cậy.', 'beginner',
   399000::numeric, 'pending', '/courses/sql.svg', false,
   'du-lieu-va-ai')
) as source(title, slug, description, level, price, status, thumbnail_url, is_featured, category_slug)
cross join lateral (
  select id from profiles where role = 'instructor' order by created_at limit 1
) instructor
left join categories category on category.slug = source.category_slug
where not exists (
  select 1 from courses existing where existing.slug = source.slug
);

insert into course_tag (course_id, tag_id)
select course.id, tags.id
from courses course
join tag tags on tags.slug in (
  case course.slug
    when 'nextjs-thuc-chien' then 'nextjs'
    when 'typescript-nen-tang' then 'typescript'
    when 'phan-tich-du-lieu-python' then 'python'
    when 'sql-cho-nguoi-lam-san-pham' then 'sql'
  end,
  'thuc-hanh'
)
where course.slug in (
  'nextjs-thuc-chien', 'typescript-nen-tang',
  'phan-tich-du-lieu-python', 'sql-cho-nguoi-lam-san-pham'
)
and not exists (
  select 1
  from course_tag existing
  where existing.course_id = course.id and existing.tag_id = tags.id
);

insert into chapters (course_id, title, position)
select course.id, source.title, source.position
from (values
  ('nextjs-thuc-chien', 'Nền tảng Next.js', 1),
  ('nextjs-thuc-chien', 'Xây dựng tính năng', 2),
  ('typescript-nen-tang', 'Type system cốt lõi', 1),
  ('typescript-nen-tang', 'TypeScript trong dự án', 2),
  ('phan-tich-du-lieu-python', 'Chuẩn bị dữ liệu', 1),
  ('phan-tich-du-lieu-python', 'Phân tích và trực quan hóa', 2),
  ('sql-cho-nguoi-lam-san-pham', 'Truy vấn dữ liệu', 1),
  ('sql-cho-nguoi-lam-san-pham', 'Báo cáo sản phẩm', 2)
) as source(course_slug, title, position)
join courses course on course.slug = source.course_slug
where not exists (
  select 1 from chapters existing
  where existing.course_id = course.id and existing.position = source.position
);

insert into lessons (
  chapter_id, title, video_url, video_status, duration_seconds, is_free, position
)
select chapter.id, source.title, source.video_url, 'ready', source.duration_seconds,
       source.is_free, source.position
from (values
  ('nextjs-thuc-chien', 1, 'App Router và cấu trúc dự án', 'https://example.com/video/nextjs-01', 720, true, 1),
  ('nextjs-thuc-chien', 1, 'Server Component và Client Component', 'https://example.com/video/nextjs-02', 900, false, 2),
  ('nextjs-thuc-chien', 2, 'Tạo trang catalog', 'https://example.com/video/nextjs-03', 1080, false, 1),
  ('typescript-nen-tang', 1, 'Primitive types và union types', 'https://example.com/video/ts-01', 660, true, 1),
  ('typescript-nen-tang', 2, 'Generics trong thực tế', 'https://example.com/video/ts-02', 840, false, 1),
  ('phan-tich-du-lieu-python', 1, 'Đọc và làm sạch dữ liệu', 'https://example.com/video/python-01', 780, true, 1),
  ('phan-tich-du-lieu-python', 2, 'Biểu đồ đầu tiên với Python', 'https://example.com/video/python-02', 960, false, 1),
  ('sql-cho-nguoi-lam-san-pham', 1, 'SELECT, WHERE và ORDER BY', 'https://example.com/video/sql-01', 600, true, 1),
  ('sql-cho-nguoi-lam-san-pham', 2, 'Tổng hợp dữ liệu sản phẩm', 'https://example.com/video/sql-02', 900, false, 1)
) as source(course_slug, chapter_position, title, video_url, duration_seconds, is_free, position)
join courses course on course.slug = source.course_slug
join chapters chapter on chapter.course_id = course.id
  and chapter.position = source.chapter_position
where not exists (
  select 1 from lessons existing
  where existing.chapter_id = chapter.id and existing.position = source.position
);

insert into attachments (lesson_id, name, file_url, type)
select lesson.id, 'Tài liệu tham khảo',
       'https://example.com/files/' || lesson.id || '-reference.pdf', 'pdf'
from lessons lesson
where lesson.position = 1
and not exists (
  select 1 from attachments existing
  where existing.lesson_id = lesson.id and existing.name = 'Tài liệu tham khảo'
);

insert into coupon (
  code, type, value, instructor_id, valid_from, valid_to, usage_limit
)
select source.code, source.type::coupon_type, source.value, instructor.id,
       now() - interval '1 day', now() + interval '90 days', source.usage_limit
from (values
  ('WELCOME10', 'percent', 10::numeric, 100),
  ('SAVE100K', 'fixed', 100000::numeric, 50)
) as source(code, type, value, usage_limit)
cross join lateral (
  select id from profiles where role = 'instructor' order by created_at limit 1
) instructor
where not exists (
  select 1 from coupon existing where existing.code = source.code
);

insert into reviews (course_id, user_id, rating, comment, status)
select course.id, reviewer.id, source.rating, source.comment, source.status::review_status
from (values
  ('nextjs-thuc-chien', 5, 'Nội dung thực hành rõ ràng.', 'visible'),
  ('typescript-nen-tang', 4, 'Phần generics rất hữu ích.', 'visible'),
  ('phan-tich-du-lieu-python', 3, 'Có thể bổ sung thêm bài tập.', 'hidden')
) as source(course_slug, rating, comment, status)
join courses course on course.slug = source.course_slug
cross join lateral (
  select id from profiles where role = 'student' order by created_at limit 1
) reviewer
where not exists (
  select 1 from reviews existing
  where existing.course_id = course.id and existing.user_id = reviewer.id
);


-- ======================= M2 — HỌC TẬP / ĐIỂM DANH =================== --
-- TODO (M2): enrollment + lesson_progress + quiz/câu hỏi/đáp án + exam_attempt
--            + 1 certificate + live_session + attendance mẫu + qa + note.
