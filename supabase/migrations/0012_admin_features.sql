-- =====================================================================
-- 0012_admin_features.sql  ·  Chủ: LEADER (L)
-- Hàm cho các chức năng quản trị còn thiếu:
--   admin       : lý do khi từ chối/ẩn khóa học + báo giảng viên; lý do khi
--                 khóa tài khoản; gửi thông báo hệ thống hàng loạt.
--   super_admin : từ chối hoàn tiền; đánh dấu payout đã chi trả.
-- Chạy SAU 0011. Mọi hàm ghi activity_log qua fn_log_activity.
-- =====================================================================

-- ------------------------------------------------------------------ --
-- 1) Duyệt khóa học — thêm lý do + thông báo cho giảng viên.
--    Đổi chữ ký (thêm p_reason) → phải bỏ bản 2 tham số cũ, nếu không
--    PostgREST không chọn được hàm khi gọi rpc.
-- ------------------------------------------------------------------ --
drop function if exists fn_moderate_course(uuid, course_status);

create or replace function fn_moderate_course(p_course uuid, p_status course_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old    course_status;
  v_owner  uuid;
  v_title  text;
  v_reason text := nullif(trim(p_reason), '');
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if p_status in ('rejected', 'hidden') and v_reason is null then
    raise exception 'Cần nhập lý do khi từ chối hoặc ẩn khóa học';
  end if;

  select status, instructor_id, title into v_old, v_owner, v_title from courses where id = p_course for update;
  if not found then raise exception 'Không tìm thấy khóa học'; end if;
  if v_old = p_status then return; end if;

  update courses set status = p_status where id = p_course;
  perform fn_log_activity('moderate_course', 'course', p_course, v_reason,
                          jsonb_build_object('from', v_old, 'to', p_status));

  if p_status in ('published', 'rejected', 'hidden') then
    insert into notification (user_id, type, title, body)
    values (
      v_owner, 'system',
      case p_status
        when 'published' then 'Khóa học đã được duyệt'
        when 'rejected'  then 'Khóa học bị từ chối'
        else 'Khóa học đã bị ẩn'
      end,
      '"' || v_title || '"' || coalesce(' — Lý do: ' || v_reason, '')
    );
  end if;
end $$;

-- ------------------------------------------------------------------ --
-- 2) Khóa/mở khóa tài khoản — bắt buộc lý do khi KHÓA.
--    Giữ nguyên các luật của 0010 (không tự khóa, không khóa super admin…).
-- ------------------------------------------------------------------ --
drop function if exists fn_toggle_ban(uuid);

create or replace function fn_toggle_ban(p_user uuid, p_reason text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_role   user_role;
  v_banned boolean;
  v_state  boolean;
  v_reason text := nullif(trim(p_reason), '');
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if p_user = auth.uid() then raise exception 'Không thể tự khóa chính mình'; end if;

  select role, is_banned into v_role, v_banned from profiles where id = p_user for update;
  if not found then raise exception 'Không tìm thấy người dùng'; end if;
  if v_role = 'super_admin' then
    raise exception 'Không thể khóa super admin — hạ quyền trước';
  end if;
  if v_role = 'admin' and not fn_is_super_admin() then
    raise exception 'Chỉ super admin mới được khóa/mở khóa admin';
  end if;
  if not v_banned and v_reason is null then
    raise exception 'Cần nhập lý do khi khóa tài khoản';
  end if;

  update profiles set is_banned = not is_banned where id = p_user returning is_banned into v_state;
  perform fn_log_activity(case when v_state then 'ban_user' else 'unban_user' end, 'user', p_user, v_reason);
  return v_state;
end $$;

-- ------------------------------------------------------------------ --
-- 3) Hoàn tiền — duyệt (thêm thông báo) + từ chối (mới). Chỉ super_admin.
-- ------------------------------------------------------------------ --
create or replace function fn_approve_refund(p_refund uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ref refund%rowtype; v_pay payments%rowtype; v_title text;
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

  select title into v_title from courses where id = v_pay.course_id;
  insert into notification (user_id, type, title, body)
    values (v_pay.user_id, 'system', 'Yêu cầu hoàn tiền đã được duyệt', '"' || coalesce(v_title, '') || '"');

  perform fn_log_activity('approve_refund', 'refund', p_refund, null,
                          jsonb_build_object('payment_id', v_pay.id, 'amount', v_pay.amount));
end $$;

create or replace function fn_reject_refund(p_refund uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ref    refund%rowtype;
  v_user   uuid;
  v_title  text;
  v_reason text := nullif(trim(p_reason), '');
begin
  if not fn_is_super_admin() then raise exception 'Chỉ super admin mới được xử lý hoàn tiền'; end if;
  if v_reason is null then raise exception 'Cần nhập lý do từ chối'; end if;
  select * into v_ref from refund where id = p_refund for update;
  if not found then raise exception 'Không thấy yêu cầu hoàn tiền'; end if;
  if v_ref.status <> 'pending' then raise exception 'Yêu cầu hoàn tiền đã được xử lý'; end if;

  update refund set status = 'rejected', resolved_at = now() where id = p_refund;

  select pm.user_id, c.title into v_user, v_title
    from payments pm join courses c on c.id = pm.course_id
    where pm.id = v_ref.payment_id;
  insert into notification (user_id, type, title, body)
    values (v_user, 'system', 'Yêu cầu hoàn tiền bị từ chối',
            '"' || coalesce(v_title, '') || '" — Lý do: ' || v_reason);

  perform fn_log_activity('reject_refund', 'refund', p_refund, v_reason,
                          jsonb_build_object('payment_id', v_ref.payment_id));
end $$;

-- ------------------------------------------------------------------ --
-- 4) Payout — đánh dấu đã chi trả (draft → paid). Chỉ super_admin.
-- ------------------------------------------------------------------ --
create or replace function fn_mark_payout_paid(p_payout uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_payout payout%rowtype;
begin
  if not fn_is_super_admin() then raise exception 'Chỉ super admin mới được chi trả payout'; end if;
  select * into v_payout from payout where id = p_payout for update;
  if not found then raise exception 'Không tìm thấy payout'; end if;
  if v_payout.status <> 'draft' then raise exception 'Payout này đã được chi trả'; end if;

  update payout set status = 'paid' where id = p_payout;
  insert into notification (user_id, type, title, body)
    values (v_payout.instructor_id, 'system', 'Đã chi trả payout kỳ ' || v_payout.period,
            'Số tiền thực nhận: ' || to_char(v_payout.net, 'FM999,999,999,990') || ' ₫');

  perform fn_log_activity('mark_payout_paid', 'payout', p_payout, null,
                          jsonb_build_object('period', v_payout.period, 'net', v_payout.net));
end $$;

-- ------------------------------------------------------------------ --
-- 5) Thông báo hệ thống hàng loạt (admin). Bảng notification không có
--    policy INSERT cho client → phải đi qua hàm definer này.
--    Đối tượng: học viên đang học 1 khóa (p_course) › theo vai trò (p_role)
--    › toàn bộ. Bỏ qua tài khoản bị khóa. Trả về số người nhận.
-- ------------------------------------------------------------------ --
create or replace function fn_broadcast_notification(
  p_title  text,
  p_body   text      default null,
  p_role   user_role default null,
  p_course uuid      default null
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_title text := nullif(trim(p_title), '');
  v_body  text := nullif(trim(p_body), '');
  v_count integer;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if v_title is null then raise exception 'Cần nhập tiêu đề'; end if;
  if length(v_title) > 200 then raise exception 'Tiêu đề tối đa 200 ký tự'; end if;

  if p_course is not null then
    insert into notification (user_id, type, title, body)
    select e.user_id, 'system', v_title, v_body
    from enrollments e join profiles p on p.id = e.user_id
    where e.course_id = p_course and e.status = 'active' and not p.is_banned;
  else
    insert into notification (user_id, type, title, body)
    select p.id, 'system', v_title, v_body
    from profiles p
    where not p.is_banned and (p_role is null or p.role = p_role);
  end if;
  get diagnostics v_count = row_count;

  perform fn_log_activity('broadcast_notification', 'notification', null, null,
                          jsonb_build_object('title', v_title, 'role', p_role,
                                             'course_id', p_course, 'recipients', v_count));
  return v_count;
end $$;
