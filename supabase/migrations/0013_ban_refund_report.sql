-- =====================================================================
-- 0013_ban_refund_report.sql  ·  Chủ: LEADER (L)
-- 1) Khóa tài khoản có hiệu lực thật với MỌI vai trò (trước đây is_banned
--    chỉ tước quyền admin): chặn đăng nhập ở Supabase Auth + chặn ghi dữ liệu.
-- 2) Học viên yêu cầu hoàn tiền: siết điều kiện fn_request_refund.
-- 3) Báo cáo vi phạm: fn_submit_report (kiểm tra + chống trùng).
-- Chạy SAU 0012.
-- =====================================================================

-- ------------------------------------------------------------------ --
-- 1a) Chặn GHI dữ liệu khi người thực hiện đang bị khóa.
--     Dùng trigger (không dùng RLS) vì trigger chạy cả khi ghi qua hàm
--     security definer (fn_mock_purchase, fn_update_watch, fn_ask_question…).
--     auth.uid() null (seed, service_role, cron) → bỏ qua.
-- ------------------------------------------------------------------ --
create or replace function fn_block_banned_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and exists (select 1 from profiles where id = auth.uid() and is_banned) then
    raise exception 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.';
  end if;
  return coalesce(new, old);
end $$;

-- Ghi của học viên / giảng viên. (Thao tác admin chạy với auth.uid() của admin → không bị chặn.)
drop trigger if exists trg_payments_block_banned on payments;
create trigger trg_payments_block_banned before insert on payments
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_enrollments_block_banned on enrollments;
create trigger trg_enrollments_block_banned before insert on enrollments
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_cart_item_block_banned on cart_item;
create trigger trg_cart_item_block_banned before insert on cart_item
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_wishlist_block_banned on wishlist;
create trigger trg_wishlist_block_banned before insert on wishlist
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_reviews_block_banned on reviews;
create trigger trg_reviews_block_banned before insert or update on reviews
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_qa_question_block_banned on qa_question;
create trigger trg_qa_question_block_banned before insert or update on qa_question
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_qa_answer_block_banned on qa_answer;
create trigger trg_qa_answer_block_banned before insert or update on qa_answer
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_lesson_note_block_banned on lesson_note;
create trigger trg_lesson_note_block_banned before insert or update on lesson_note
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_lesson_progress_block_banned on lesson_progress;
create trigger trg_lesson_progress_block_banned before insert or update on lesson_progress
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_exam_attempts_block_banned on exam_attempts;
create trigger trg_exam_attempts_block_banned before insert on exam_attempts
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_report_block_banned on report;
create trigger trg_report_block_banned before insert on report
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_refund_block_banned on refund;
create trigger trg_refund_block_banned before insert on refund
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_courses_block_banned on courses;
create trigger trg_courses_block_banned before insert or update on courses
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_live_sessions_block_banned on live_sessions;
create trigger trg_live_sessions_block_banned before insert or update on live_sessions
  for each row execute function fn_block_banned_user();
drop trigger if exists trg_coupon_block_banned on coupon;
create trigger trg_coupon_block_banned before insert or update on coupon
  for each row execute function fn_block_banned_user();

-- ------------------------------------------------------------------ --
-- 1b) Đồng bộ khóa sang Supabase Auth: banned_until → Auth từ chối đăng
--     nhập và làm mới phiên. Xóa phiên đang mở để buộc đăng xuất sớm.
--     Bọc exception: nếu môi trường không cho sửa schema auth thì vẫn
--     khóa được ở tầng app + trigger 1a, không làm hỏng thao tác khóa.
-- ------------------------------------------------------------------ --
create or replace function fn_sync_auth_ban()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_banned is distinct from old.is_banned then
    begin
      update auth.users
        set banned_until = case when new.is_banned then now() + interval '100 years' else null end
        where id = new.id;
      if new.is_banned and to_regclass('auth.sessions') is not null then
        execute 'delete from auth.sessions where user_id = $1' using new.id;
      end if;
    exception when others then
      raise warning 'fn_sync_auth_ban: không cập nhật được auth.users (%)', sqlerrm;
    end;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_sync_auth_ban on profiles;
create trigger trg_profiles_sync_auth_ban
  after update of is_banned on profiles
  for each row execute function fn_sync_auth_ban();

-- Đồng bộ các tài khoản ĐÃ bị khóa trước migration này.
do $$
begin
  update auth.users u set banned_until = now() + interval '100 years'
    from profiles p where p.id = u.id and p.is_banned and u.banned_until is null;
exception when others then
  raise warning '0013: bỏ qua đồng bộ banned_until (%)', sqlerrm;
end $$;

-- ------------------------------------------------------------------ --
-- 2) Yêu cầu hoàn tiền — giữ chữ ký của 0006, thêm điều kiện.
--    Hạn yêu cầu: system_setting 'refund_window_days' (mặc định 7 ngày).
-- ------------------------------------------------------------------ --
insert into system_setting (key, value) values ('refund_window_days', '7'::jsonb)
  on conflict (key) do nothing;

create or replace function fn_request_refund(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pay    payments%rowtype;
  v_reason text := nullif(trim(p_reason), '');
  v_days   integer := coalesce((fn_get_setting('refund_window_days') #>> '{}')::integer, 7);
begin
  if not fn_owns_payment(p_payment) then
    raise exception 'Không phải giao dịch của bạn';
  end if;
  if v_reason is null then raise exception 'Vui lòng nhập lý do hoàn tiền'; end if;
  if length(v_reason) > 1000 then raise exception 'Lý do tối đa 1000 ký tự'; end if;

  -- Khóa dòng giao dịch để 2 yêu cầu gửi cùng lúc không lọt qua kiểm tra trùng.
  select * into v_pay from payments where id = p_payment for update;
  if v_pay.status <> 'paid' then raise exception 'Giao dịch này không ở trạng thái đã thanh toán'; end if;
  if v_pay.created_at < now() - make_interval(days => v_days) then
    raise exception 'Đã quá hạn yêu cầu hoàn tiền (% ngày kể từ khi mua)', v_days;
  end if;
  if exists (select 1 from refund where payment_id = p_payment and status in ('pending', 'approved')) then
    raise exception 'Giao dịch này đã có yêu cầu hoàn tiền';
  end if;

  insert into refund (payment_id, reason, status) values (p_payment, v_reason, 'pending');
end $$;

-- ------------------------------------------------------------------ --
-- 3) Báo cáo vi phạm — kiểm tra đối tượng tồn tại, không tự báo cáo
--    chính mình, không trùng báo cáo đang mở của cùng người.
-- ------------------------------------------------------------------ --
create or replace function fn_submit_report(p_entity text, p_entity_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_reason text := nullif(trim(p_reason), '');
  v_id     uuid;
begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập để báo cáo'; end if;
  if v_reason is null then raise exception 'Vui lòng nhập lý do báo cáo'; end if;
  if length(v_reason) > 1000 then raise exception 'Lý do tối đa 1000 ký tự'; end if;

  if p_entity = 'course' then
    if not exists (select 1 from courses where id = p_entity_id) then raise exception 'Không tìm thấy khóa học'; end if;
  elsif p_entity = 'review' then
    if not exists (select 1 from reviews where id = p_entity_id) then raise exception 'Không tìm thấy đánh giá'; end if;
    if exists (select 1 from reviews where id = p_entity_id and user_id = auth.uid()) then
      raise exception 'Không thể báo cáo đánh giá của chính bạn';
    end if;
  elsif p_entity = 'user' then
    if not exists (select 1 from profiles where id = p_entity_id) then raise exception 'Không tìm thấy người dùng'; end if;
    if p_entity_id = auth.uid() then raise exception 'Không thể tự báo cáo chính mình'; end if;
  else
    raise exception 'Loại đối tượng không hợp lệ';
  end if;

  if exists (select 1 from report where reporter_id = auth.uid() and entity = p_entity
             and entity_id = p_entity_id and status = 'open') then
    raise exception 'Bạn đã báo cáo nội dung này, quản trị viên đang xem xét';
  end if;

  insert into report (reporter_id, entity, entity_id, reason)
    values (auth.uid(), p_entity, p_entity_id, v_reason)
    returning id into v_id;
  return v_id;
end $$;
