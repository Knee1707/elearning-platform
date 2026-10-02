-- 0020_live_session_date_validation.sql
-- Không cho tạo/cập nhật buổi live có ngày trước ngày hiện tại.
-- Dùng trigger thay vì CHECK vì current_date thay đổi theo thời gian.

create or replace function fn_validate_live_session_date()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.scheduled_at is not null
     and (new.scheduled_at at time zone 'Asia/Ho_Chi_Minh')::date
         < (now() at time zone 'Asia/Ho_Chi_Minh')::date then
    raise exception 'Ngày buổi học live phải bằng hoặc lớn hơn ngày hiện tại';
  end if;
  return new;
end $$;

drop trigger if exists trg_live_sessions_validate_date on live_sessions;
create trigger trg_live_sessions_validate_date
  before insert or update of scheduled_at on live_sessions
  for each row execute function fn_validate_live_session_date();
