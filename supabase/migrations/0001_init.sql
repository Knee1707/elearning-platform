-- =====================================================================
-- 0001_init.sql  ·  Chủ: LEADER (L)
-- Enum + hàm phân quyền + cụm Danh tính/Cấu hình + coupon.
-- Postgres 15 (Supabase). Khóa chính uuid dùng gen_random_uuid() (có sẵn core PG13+).
-- Chạy ĐẦU TIÊN. Không phụ thuộc bảng nào khác.
-- =====================================================================

-- ------------------------------------------------------------------ --
-- 1) ENUM DÙNG CHUNG (11 kiểu)
-- ------------------------------------------------------------------ --
create type user_role         as enum ('student', 'instructor', 'admin');
create type course_status     as enum ('draft', 'pending', 'published', 'rejected', 'hidden');
create type enrollment_status as enum ('active', 'refunded');
create type payment_status    as enum ('pending', 'paid', 'refunded');
create type attendance_source as enum ('video', 'live');
create type coupon_type       as enum ('percent', 'fixed');
create type review_status     as enum ('visible', 'hidden', 'pending');
create type refund_status     as enum ('pending', 'approved', 'rejected');
create type report_status     as enum ('open', 'resolved', 'dismissed');
create type payout_status     as enum ('draft', 'paid');
create type notif_type        as enum ('purchase', 'reply', 'system', 'reminder');

-- ------------------------------------------------------------------ --
-- 2) profiles — 1-1 với auth.users (Supabase Auth)
-- ------------------------------------------------------------------ --
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text        not null default '',
  avatar_url text,
  role       user_role   not null default 'student',
  is_banned  boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ --
-- 3) system_setting — cấu hình key/value tập trung (phí, ngưỡng…)
-- ------------------------------------------------------------------ --
create table system_setting (
  key        text        primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ --
-- 4) activity_log — nhật ký hành động
-- ------------------------------------------------------------------ --
create table activity_log (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references profiles (id) on delete set null,
  action     text        not null,
  entity     text,
  entity_id  uuid,
  created_at timestamptz not null default now()
);
create index idx_activity_log_user_id    on activity_log (user_id);
create index idx_activity_log_created_at on activity_log (created_at desc);

-- ------------------------------------------------------------------ --
-- 5) coupon — mã giảm giá (instructor_id NULL = mã toàn hệ thống)
-- ------------------------------------------------------------------ --
create table coupon (
  id            uuid          primary key default gen_random_uuid(),
  code          text          not null unique,
  type          coupon_type   not null,
  value         numeric(12,2) not null check (value > 0),
  instructor_id uuid          references profiles (id) on delete cascade,
  valid_from    timestamptz   not null default now(),
  valid_to      timestamptz,
  usage_limit   integer       check (usage_limit is null or usage_limit >= 0),
  used_count    integer       not null default 0,
  created_at    timestamptz   not null default now(),
  -- mã phần trăm không vượt 100%
  constraint coupon_percent_max check (type <> 'percent' or value <= 100)
);
create index idx_coupon_code on coupon (code);

-- ------------------------------------------------------------------ --
-- 6) HÀM PHÂN QUYỀN — security definer để KHÔNG đệ quy RLS
--    (định nghĩa sớm vì RLS các file sau sẽ gọi tới)
-- ------------------------------------------------------------------ --
create or replace function fn_current_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function fn_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'admin', false)
$$;

-- ------------------------------------------------------------------ --
-- 7) RLS
-- ------------------------------------------------------------------ --
alter table profiles       enable row level security;
alter table system_setting enable row level security;
alter table activity_log   enable row level security;
alter table coupon         enable row level security;

-- profiles: đọc công khai (tên/ảnh GV & người review hiện trên catalog);
--           mỗi người chỉ tạo/sửa hồ sơ CHÍNH MÌNH; admin sửa được mọi hồ sơ.
create policy profiles_select_public on profiles
  for select using (true);
create policy profiles_insert_self on profiles
  for insert with check (id = auth.uid());
create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on profiles
  for update using (fn_is_admin()) with check (fn_is_admin());

-- system_setting: đọc công khai (app cần ngưỡng…); chỉ admin ghi.
create policy setting_select_all on system_setting
  for select using (true);
create policy setting_write_admin on system_setting
  for all using (fn_is_admin()) with check (fn_is_admin());

-- activity_log: chủ đọc của mình, admin đọc tất cả. Ghi do trigger (security definer).
create policy activity_select_own on activity_log
  for select using (user_id = auth.uid() or fn_is_admin());

-- coupon: đọc công khai (để áp mã); admin toàn quyền; GV quản mã CỦA MÌNH.
create policy coupon_select_all on coupon
  for select using (true);
create policy coupon_admin_all on coupon
  for all using (fn_is_admin()) with check (fn_is_admin());
create policy coupon_instructor_write on coupon
  for all using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());
