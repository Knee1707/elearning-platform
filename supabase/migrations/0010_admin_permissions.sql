-- =====================================================================
-- 0010_admin_permissions.sql  ·  Chủ: LEADER (L)
-- Phân quyền 2 tầng Admin / Super Admin + nhật ký kiểm toán (audit log).
-- Chạy SAU 0009_super_admin_role.sql (enum 'super_admin' phải commit trước).
--
-- Tóm tắt quyền:
--   admin       : kiểm duyệt khóa/review/report, quản lý student & instructor.
--   super_admin : mọi quyền admin + cấp/thu hồi admin, cấu hình hệ thống,
--                 duyệt hoàn tiền, tạo payout.
--   Tài khoản bị khóa (is_banned) mất toàn bộ quyền quản trị.
--   Mọi thao tác quản trị đều ghi activity_log.
-- =====================================================================

-- ------------------------------------------------------------------ --
-- 1) activity_log: thêm lý do + dữ liệu phụ (trước/sau…)
-- ------------------------------------------------------------------ --
alter table activity_log add column if not exists reason   text;
alter table activity_log add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists idx_activity_log_entity on activity_log (entity, entity_id);

-- ------------------------------------------------------------------ --
-- 2) HÀM PHÂN QUYỀN
-- ------------------------------------------------------------------ --
-- fn_is_admin: nay gồm cả super_admin → mọi RLS/hàm cũ gọi fn_is_admin()
-- tự động cho super_admin đi qua, không cần sửa lại.
create or replace function fn_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role in ('admin', 'super_admin') and not is_banned from profiles where id = auth.uid()),
    false)
$$;

create or replace function fn_is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role = 'super_admin' and not is_banned from profiles where id = auth.uid()),
    false)
$$;

-- ------------------------------------------------------------------ --
-- 3) GHI NHẬT KÝ — chỉ gọi từ hàm security definer khác.
--    Thu hồi EXECUTE của client để không ai tự chèn log giả.
-- ------------------------------------------------------------------ --
create or replace function fn_log_activity(
  p_action    text,
  p_entity    text  default null,
  p_entity_id uuid  default null,
  p_reason    text  default null,
  p_metadata  jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into activity_log (user_id, action, entity, entity_id, reason, metadata)
    values (auth.uid(), p_action, p_entity, p_entity_id, p_reason, coalesce(p_metadata, '{}'::jsonb));
end $$;

revoke execute on function fn_log_activity(text, text, uuid, text, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------------ --
-- 4) CHỐNG LEO THANG QUYỀN trên profiles
--    Trước đây policy profiles_update_self cho user tự UPDATE hồ sơ mình
--    → có thể tự đặt role = 'admin'. Trigger này chặn client (anon/
--    authenticated) đổi role/is_banned trực tiếp; chỉ hàm security
--    definer (fn_set_role, fn_toggle_ban — chạy dưới quyền owner) mới đổi được.
-- ------------------------------------------------------------------ --
create or replace function fn_guard_profile_privilege()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;   -- postgres / service_role / hàm security definer
  end if;

  if tg_op = 'INSERT' then
    if new.role <> 'student' or new.is_banned then
      raise exception 'Không được tự đặt vai trò hoặc trạng thái khóa khi tạo hồ sơ';
    end if;
  elsif new.role is distinct from old.role or new.is_banned is distinct from old.is_banned then
    raise exception 'Không được đổi vai trò/trạng thái khóa trực tiếp — dùng fn_set_role / fn_toggle_ban';
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_guard_privilege on profiles;
create trigger trg_profiles_guard_privilege
  before insert or update on profiles
  for each row execute function fn_guard_profile_privilege();

-- Admin thường chỉ sửa được hồ sơ student/instructor; hồ sơ admin/super_admin
-- chỉ super_admin sửa.
drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles
  for update
  using      (fn_is_super_admin() or (fn_is_admin() and role not in ('admin', 'super_admin')))
  with check (fn_is_super_admin() or (fn_is_admin() and role not in ('admin', 'super_admin')));

-- ------------------------------------------------------------------ --
-- 5) system_setting: chỉ super_admin ghi (admin vẫn đọc như mọi người)
-- ------------------------------------------------------------------ --
drop policy if exists setting_write_admin on system_setting;
create policy setting_write_super_admin on system_setting
  for all using (fn_is_super_admin()) with check (fn_is_super_admin());

-- ------------------------------------------------------------------ --
-- 6) courses: super_admin cũng được tạo khóa như admin (giữ tương đương)
-- ------------------------------------------------------------------ --
drop policy if exists courses_insert_owner on courses;
create policy courses_insert_owner on courses
  for insert with check (
    instructor_id = auth.uid()
    and fn_current_role() in ('instructor', 'admin', 'super_admin')
  );

-- ------------------------------------------------------------------ --
-- 7) QUẢN LÝ NGƯỜI DÙNG (giữ nguyên chữ ký hàm của 0006)
-- ------------------------------------------------------------------ --
create or replace function fn_set_role(p_user uuid, p_role user_role)
returns void language plpgsql security definer set search_path = public as $$
declare v_old user_role;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if p_user = auth.uid() then raise exception 'Không thể tự đổi vai trò của chính mình'; end if;

  select role into v_old from profiles where id = p_user for update;
  if not found then raise exception 'Không tìm thấy người dùng'; end if;
  if v_old = p_role then return; end if;

  -- Cấp hoặc thu hồi quyền quản trị → chỉ super_admin.
  if (v_old in ('admin', 'super_admin') or p_role in ('admin', 'super_admin'))
     and not fn_is_super_admin() then
    raise exception 'Chỉ super admin mới được cấp/thu hồi quyền quản trị';
  end if;

  -- Luôn giữ ít nhất 1 super_admin đang hoạt động.
  if v_old = 'super_admin' and not exists (
    select 1 from profiles where role = 'super_admin' and not is_banned and id <> p_user
  ) then
    raise exception 'Không thể hạ quyền super admin cuối cùng';
  end if;

  update profiles set role = p_role where id = p_user;
  perform fn_log_activity('set_role', 'user', p_user, null,
                          jsonb_build_object('from', v_old, 'to', p_role));
end $$;

create or replace function fn_toggle_ban(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_role user_role; v_state boolean;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if p_user = auth.uid() then raise exception 'Không thể tự khóa chính mình'; end if;

  select role into v_role from profiles where id = p_user for update;
  if not found then raise exception 'Không tìm thấy người dùng'; end if;
  if v_role = 'super_admin' then
    raise exception 'Không thể khóa super admin — hạ quyền trước';
  end if;
  if v_role = 'admin' and not fn_is_super_admin() then
    raise exception 'Chỉ super admin mới được khóa/mở khóa admin';
  end if;

  update profiles set is_banned = not is_banned where id = p_user returning is_banned into v_state;
  perform fn_log_activity(case when v_state then 'ban_user' else 'unban_user' end, 'user', p_user);
  return v_state;
end $$;

-- ------------------------------------------------------------------ --
-- 8) KIỂM DUYỆT (admin) — thêm ghi nhật ký trước/sau
-- ------------------------------------------------------------------ --
create or replace function fn_moderate_course(p_course uuid, p_status course_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_old course_status;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  select status into v_old from courses where id = p_course for update;
  if not found then raise exception 'Không tìm thấy khóa học'; end if;

  update courses set status = p_status where id = p_course;
  perform fn_log_activity('moderate_course', 'course', p_course, null,
                          jsonb_build_object('from', v_old, 'to', p_status));
end $$;

create or replace function fn_moderate_review(p_review uuid, p_status review_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_old review_status;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  select status into v_old from reviews where id = p_review for update;
  if not found then raise exception 'Không tìm thấy review'; end if;

  update reviews set status = p_status where id = p_review;
  perform fn_log_activity('moderate_review', 'review', p_review, null,
                          jsonb_build_object('from', v_old, 'to', p_status));
end $$;

create or replace function fn_resolve_report(p_report uuid, p_status report_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_old report_status;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  select status into v_old from report where id = p_report for update;
  if not found then raise exception 'Không tìm thấy báo cáo'; end if;

  update report set status = p_status where id = p_report;
  perform fn_log_activity('resolve_report', 'report', p_report, null,
                          jsonb_build_object('from', v_old, 'to', p_status));
end $$;

-- ------------------------------------------------------------------ --
-- 9) TÀI CHÍNH — chỉ super_admin
-- ------------------------------------------------------------------ --
create or replace function fn_approve_refund(p_refund uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ref refund%rowtype; v_pay payments%rowtype;
begin
  if not fn_is_super_admin() then raise exception 'Chỉ super admin mới được duyệt hoàn tiền'; end if;
  select * into v_ref from refund where id = p_refund for update;
  if not found then raise exception 'Không thấy yêu cầu hoàn tiền'; end if;
  if v_ref.status <> 'pending' then raise exception 'Yêu cầu hoàn tiền đã được xử lý'; end if;

  update refund set status = 'approved', resolved_at = now() where id = p_refund;
  select * into v_pay from payments where id = v_ref.payment_id;
  update payments   set status = 'refunded' where id = v_pay.id;
  update enrollments set status = 'refunded'
    where user_id = v_pay.user_id and course_id = v_pay.course_id;

  perform fn_log_activity('approve_refund', 'refund', p_refund, null,
                          jsonb_build_object('payment_id', v_pay.id, 'amount', v_pay.amount));
end $$;

create or replace function fn_generate_payout(p_period text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_fee numeric := coalesce((fn_get_setting('platform_fee_percent') #>> '{}')::numeric, 20);
begin
  if not fn_is_super_admin() then raise exception 'Chỉ super admin mới được tạo payout'; end if;
  if p_period !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Kỳ phải có dạng YYYY-MM'; end if;

  insert into payout (instructor_id, period, gross, platform_fee, net, status)
  select c.instructor_id,
         p_period,
         sum(pm.amount),
         round(sum(pm.amount) * v_fee / 100, 2),
         round(sum(pm.amount) * (1 - v_fee / 100), 2),
         'draft'
  from payments pm
  join courses c on c.id = pm.course_id
  where pm.status = 'paid'
    and to_char(pm.created_at, 'YYYY-MM') = p_period
  group by c.instructor_id
  on conflict (instructor_id, period) do update
    set gross = excluded.gross, platform_fee = excluded.platform_fee, net = excluded.net
    where payout.status = 'draft';   -- không ghi đè kỳ đã chi trả

  perform fn_log_activity('generate_payout', 'payout', null, null,
                          jsonb_build_object('period', p_period, 'fee_percent', v_fee));
end $$;
