-- =====================================================================
-- 0011_setting_audit.sql  ·  Chủ: LEADER (L)
-- Ghi activity_log mỗi khi system_setting thay đổi (trang Cấu hình của
-- Super Admin ghi thẳng bảng này qua RLS setting_write_super_admin).
-- Chạy SAU 0010 (cần fn_log_activity).
-- =====================================================================

create or replace function fn_log_setting_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform fn_log_activity('update_setting', 'setting', null, null,
                            jsonb_build_object('key', new.key, 'from', null, 'to', new.value));
  elsif tg_op = 'UPDATE' then
    if new.value is not distinct from old.value then return null; end if;   -- không đổi → không log
    perform fn_log_activity('update_setting', 'setting', null, null,
                            jsonb_build_object('key', new.key, 'from', old.value, 'to', new.value));
  else
    perform fn_log_activity('delete_setting', 'setting', null, null,
                            jsonb_build_object('key', old.key, 'from', old.value, 'to', null));
  end if;
  return null;
end $$;

drop trigger if exists trg_system_setting_audit on system_setting;
create trigger trg_system_setting_audit
  after insert or update or delete on system_setting
  for each row execute function fn_log_setting_change();
