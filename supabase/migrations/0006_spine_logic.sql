-- =====================================================================
-- 0006_spine_logic.sql  ·  Chủ: LEADER (L)
-- Hàm/view/trigger trục xương sống. CHẠY CUỐI (sau 0004 M1, 0005 M2)
-- nên KHÔNG được create-or-replace đè lên hàm của M1/M2.
-- =====================================================================

-- ------------------------------------------------------------------ --
-- 1) Cấu hình
-- ------------------------------------------------------------------ --
create or replace function fn_get_setting(p_key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select value from system_setting where key = p_key
$$;

-- ------------------------------------------------------------------ --
-- 2) Giỏ hàng / wishlist (theo RLS của chính chủ — không cần definer)
-- ------------------------------------------------------------------ --
create or replace function fn_add_to_cart(p_course uuid)
returns void language sql security invoker set search_path = public as $$
  insert into cart_item (user_id, course_id) values (auth.uid(), p_course)
  on conflict (user_id, course_id) do nothing
$$;

create or replace function fn_remove_from_cart(p_course uuid)
returns void language sql security invoker set search_path = public as $$
  delete from cart_item where user_id = auth.uid() and course_id = p_course
$$;

create or replace function fn_toggle_wishlist(p_course uuid)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
  delete from wishlist where user_id = auth.uid() and course_id = p_course;
  if found then
    return false;                       -- vừa bỏ khỏi wishlist
  end if;
  insert into wishlist (user_id, course_id) values (auth.uid(), p_course);
  return true;                          -- vừa thêm
end $$;

-- ------------------------------------------------------------------ --
-- 3) Mua mô phỏng — mở khóa (KHÔNG tiền thật)
-- ------------------------------------------------------------------ --
create or replace function fn_mock_purchase(p_course_ids uuid[], p_coupon_code text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_course record;
  v_coupon coupon%rowtype;
  v_amount numeric(12,2);
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập';
  end if;

  if p_coupon_code is not null then
    select * into v_coupon from coupon
    where code = p_coupon_code
      and valid_from <= now()
      and (valid_to is null or valid_to >= now())
      and (usage_limit is null or used_count < usage_limit);
    if not found then
      raise exception 'Mã giảm giá không hợp lệ hoặc đã hết hạn';
    end if;
  end if;

  for v_course in select * from courses where id = any (p_course_ids) and status = 'published' loop
    if exists (select 1 from enrollments e where e.user_id = v_uid and e.course_id = v_course.id) then
      continue;                         -- đã có, bỏ qua
    end if;

    v_amount := v_course.price;
    if v_coupon.id is not null then
      if v_coupon.type = 'percent' then
        v_amount := round(v_amount * (1 - v_coupon.value / 100), 2);
      else
        v_amount := greatest(v_amount - v_coupon.value, 0);
      end if;
    end if;

    insert into payments (user_id, course_id, coupon_id, amount, method, status)
      values (v_uid, v_course.id, v_coupon.id, v_amount, 'mock', 'paid');
    insert into enrollments (user_id, course_id, status)
      values (v_uid, v_course.id, 'active')
      on conflict (user_id, course_id) do nothing;
    insert into notification (user_id, type, title, body)
      values (v_uid, 'purchase', 'Mua khóa thành công', 'Đã mở khóa: ' || v_course.title);
    delete from cart_item where user_id = v_uid and course_id = v_course.id;
    insert into activity_log (user_id, action, entity, entity_id)
      values (v_uid, 'purchase', 'course', v_course.id);
  end loop;

  if v_coupon.id is not null then
    update coupon set used_count = used_count + 1 where id = v_coupon.id;
  end if;
end $$;

create or replace function fn_is_enrolled(cid uuid)   -- (đã có ở 0003; giữ đồng bộ nếu chạy lại)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e
    where e.course_id = cid and e.user_id = auth.uid() and e.status = 'active'
  )
$$;

-- ------------------------------------------------------------------ --
-- 4) Hoàn tiền
-- ------------------------------------------------------------------ --
create or replace function fn_request_refund(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not fn_owns_payment(p_payment) then
    raise exception 'Không phải giao dịch của bạn';
  end if;
  insert into refund (payment_id, reason, status) values (p_payment, p_reason, 'pending');
end $$;

create or replace function fn_approve_refund(p_refund uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ref refund%rowtype; v_pay payments%rowtype;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  select * into v_ref from refund where id = p_refund;
  if not found then raise exception 'Không thấy yêu cầu hoàn tiền'; end if;

  update refund set status = 'approved', resolved_at = now() where id = p_refund;
  select * into v_pay from payments where id = v_ref.payment_id;
  update payments   set status = 'refunded' where id = v_pay.id;
  update enrollments set status = 'refunded'
    where user_id = v_pay.user_id and course_id = v_pay.course_id;
end $$;

-- ------------------------------------------------------------------ --
-- 5) Payout — gom doanh thu theo kỳ 'YYYY-MM'
-- ------------------------------------------------------------------ --
create or replace function fn_generate_payout(p_period text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_fee numeric := coalesce((fn_get_setting('platform_fee_percent') #>> '{}')::numeric, 20);
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;

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
    set gross = excluded.gross, platform_fee = excluded.platform_fee, net = excluded.net;
end $$;

-- ------------------------------------------------------------------ --
-- 6) Quản trị (admin)
-- ------------------------------------------------------------------ --
create or replace function fn_set_role(p_user uuid, p_role user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  update profiles set role = p_role where id = p_user;
end $$;

create or replace function fn_toggle_ban(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_state boolean;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  update profiles set is_banned = not is_banned where id = p_user returning is_banned into v_state;
  return v_state;
end $$;

create or replace function fn_moderate_course(p_course uuid, p_status course_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  update courses set status = p_status where id = p_course;
  insert into activity_log (user_id, action, entity, entity_id)
    values (auth.uid(), 'moderate_course:' || p_status, 'course', p_course);
end $$;

create or replace function fn_moderate_review(p_review uuid, p_status review_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  update reviews set status = p_status where id = p_review;
end $$;

create or replace function fn_resolve_report(p_report uuid, p_status report_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  update report set status = p_status where id = p_report;
end $$;

-- ------------------------------------------------------------------ --
-- 7) Trigger: tạo profiles khi có user mới (Supabase Auth)
-- ------------------------------------------------------------------ --
create or replace function fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
    on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_profile_on_signup on auth.users;
create trigger trg_profile_on_signup
  after insert on auth.users
  for each row execute function fn_handle_new_user();

-- ------------------------------------------------------------------ --
-- 8) View báo cáo (security_invoker → RLS vẫn áp cho người gọi)
-- ------------------------------------------------------------------ --
create or replace view view_admin_dashboard with (security_invoker = true) as
select
  (select count(*) from profiles)                                  as total_users,
  (select count(*) from profiles  where role = 'instructor')       as total_instructors,
  (select count(*) from courses   where status = 'published')      as published_courses,
  (select count(*) from courses   where status = 'pending')        as pending_courses,
  (select count(*) from enrollments where status = 'active')       as active_enrollments,
  (select coalesce(sum(amount), 0) from payments where status = 'paid') as total_revenue;

create or replace view view_instructor_payout with (security_invoker = true) as
select instructor_id, period, gross, platform_fee, net, status
from payout;
