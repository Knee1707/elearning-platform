-- =====================================================================
-- 0025_profile_phone.sql · Lưu số điện thoại trong hồ sơ người dùng.
-- =====================================================================

alter table profiles add column if not exists phone text;

create or replace function fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
    )
    on conflict (id) do nothing;
  return new;
end $$;
