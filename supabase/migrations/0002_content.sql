-- =====================================================================
-- 0002_content.sql  ·  Chủ: LEADER (L) tạo bảng · M1 làm nghiệp vụ (0004)
-- Cụm Nội dung: categories, tag, course_tag, courses, chapters, lessons,
-- attachments, reviews. Phụ thuộc 0001 (profiles).
-- =====================================================================

-- ------------------------------------------------------------------ --
-- 1) BẢNG
-- ------------------------------------------------------------------ --
create table categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table tag (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table courses (
  id            uuid          primary key default gen_random_uuid(),
  instructor_id uuid          not null references profiles (id) on delete cascade,
  category_id   uuid          references categories (id) on delete set null,
  title         text          not null,
  slug          text          not null unique,
  description   text          not null default '',
  level         text          not null default 'beginner',
  price         numeric(12,2) not null default 0 check (price >= 0),
  status        course_status not null default 'draft',
  thumbnail_url text,
  is_featured   boolean       not null default false,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);
create index idx_courses_instructor_id on courses (instructor_id);
create index idx_courses_category_id   on courses (category_id);
create index idx_courses_status        on courses (status);

create table course_tag (
  course_id uuid not null references courses (id) on delete cascade,
  tag_id    uuid not null references tag (id) on delete cascade,
  primary key (course_id, tag_id)
);
create index idx_course_tag_tag_id on course_tag (tag_id);

create table chapters (
  id        uuid    primary key default gen_random_uuid(),
  course_id uuid    not null references courses (id) on delete cascade,
  title     text    not null,
  position  integer not null default 0
);
create index idx_chapters_course_id on chapters (course_id);

create table lessons (
  id               uuid    primary key default gen_random_uuid(),
  chapter_id       uuid    not null references chapters (id) on delete cascade,
  title            text    not null,
  video_url        text,
  video_status     text    not null default 'ready',   -- 'processing' | 'ready' | 'error'
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  is_free          boolean not null default false,
  position         integer not null default 0
);
create index idx_lessons_chapter_id on lessons (chapter_id);

create table attachments (
  id        uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  name      text not null,
  file_url  text not null,
  type      text
);
create index idx_attachments_lesson_id on attachments (lesson_id);

create table reviews (
  id         uuid          primary key default gen_random_uuid(),
  course_id  uuid          not null references courses (id) on delete cascade,
  user_id    uuid          not null references profiles (id) on delete cascade,
  rating     integer       not null check (rating between 1 and 5),
  comment    text,
  status     review_status not null default 'visible',
  created_at timestamptz   not null default now(),
  unique (course_id, user_id)   -- 1 người 1 review / khóa
);
create index idx_reviews_course_id on reviews (course_id);

-- ------------------------------------------------------------------ --
-- 2) HÀM HỖ TRỢ RLS (security definer → tránh đệ quy)
-- ------------------------------------------------------------------ --
-- Sở hữu khóa?
create or replace function fn_owns_course(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from courses c where c.id = cid and c.instructor_id = auth.uid())
$$;

-- Khóa có "nhìn thấy được" với người hiện tại không? (đã publish, hoặc chủ, hoặc admin)
create or replace function fn_course_visible(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from courses c
    where c.id = cid
      and (c.status = 'published' or c.instructor_id = auth.uid())
  ) or fn_is_admin()
$$;

-- Tra khóa cha của chương / bài (dùng cho RLS lessons, attachments)
create or replace function fn_chapter_course(ch uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select course_id from chapters where id = ch
$$;

create or replace function fn_lesson_course(le uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select fn_chapter_course(l.chapter_id) from lessons l where l.id = le
$$;

-- ------------------------------------------------------------------ --
-- 3) RLS
-- ------------------------------------------------------------------ --
alter table categories  enable row level security;
alter table tag         enable row level security;
alter table course_tag  enable row level security;
alter table courses     enable row level security;
alter table chapters    enable row level security;
alter table lessons     enable row level security;
alter table attachments enable row level security;
alter table reviews     enable row level security;

-- categories / tag: đọc công khai; chỉ admin ghi.
create policy categories_select_all on categories for select using (true);
create policy categories_admin_all  on categories for all using (fn_is_admin()) with check (fn_is_admin());
create policy tag_select_all on tag for select using (true);
create policy tag_admin_all  on tag for all using (fn_is_admin()) with check (fn_is_admin());

-- courses: đọc khi published / là chủ / admin; ghi bởi chủ (phải là instructor|admin) hoặc admin.
create policy courses_select_visible on courses
  for select using (status = 'published' or instructor_id = auth.uid() or fn_is_admin());
create policy courses_insert_owner on courses
  for insert with check (instructor_id = auth.uid() and fn_current_role() in ('instructor', 'admin'));
create policy courses_update_owner on courses
  for update using (instructor_id = auth.uid() or fn_is_admin())
             with check (instructor_id = auth.uid() or fn_is_admin());
create policy courses_delete_owner on courses
  for delete using (instructor_id = auth.uid() or fn_is_admin());

-- course_tag: đọc công khai; ghi bởi chủ khóa / admin.
create policy course_tag_select_all on course_tag for select using (true);
create policy course_tag_write_owner on course_tag
  for all using (fn_owns_course(course_id) or fn_is_admin())
          with check (fn_owns_course(course_id) or fn_is_admin());

-- chapters: đọc theo khóa cha "nhìn thấy được"; ghi bởi chủ khóa / admin.
create policy chapters_select_visible on chapters
  for select using (fn_course_visible(course_id));
create policy chapters_write_owner on chapters
  for all using (fn_owns_course(course_id) or fn_is_admin())
          with check (fn_owns_course(course_id) or fn_is_admin());

-- lessons: đọc theo khóa cha (qua chapter); ghi bởi chủ khóa / admin.
-- (Metadata bài hiện được với ai xem được khóa; quyền XEM VIDEO gác thêm ở app + signed URL.)
create policy lessons_select_visible on lessons
  for select using (fn_course_visible(fn_chapter_course(chapter_id)));
create policy lessons_write_owner on lessons
  for all using (fn_owns_course(fn_chapter_course(chapter_id)) or fn_is_admin())
          with check (fn_owns_course(fn_chapter_course(chapter_id)) or fn_is_admin());

-- attachments: đọc theo khóa của bài; ghi bởi chủ khóa / admin.
create policy attachments_select_visible on attachments
  for select using (fn_course_visible(fn_lesson_course(lesson_id)));
create policy attachments_write_owner on attachments
  for all using (fn_owns_course(fn_lesson_course(lesson_id)) or fn_is_admin())
          with check (fn_owns_course(fn_lesson_course(lesson_id)) or fn_is_admin());

-- reviews: đọc khi 'visible' / của mình / admin; sửa-xóa của mình / admin.
-- (Policy INSERT "phải đã ghi danh" đặt ở 0003 vì cần bảng enrollments + fn_is_enrolled.)
create policy reviews_select_visible on reviews
  for select using (status = 'visible' or user_id = auth.uid() or fn_is_admin());
create policy reviews_update_own on reviews
  for update using (user_id = auth.uid() or fn_is_admin())
             with check (user_id = auth.uid() or fn_is_admin());
create policy reviews_delete_own on reviews
  for delete using (user_id = auth.uid() or fn_is_admin());

-- ------------------------------------------------------------------ --
-- 4) updated_at tự cập nhật cho courses
-- ------------------------------------------------------------------ --
create or replace function fn_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_courses_touch
  before update on courses
  for each row execute function fn_touch_updated_at();
