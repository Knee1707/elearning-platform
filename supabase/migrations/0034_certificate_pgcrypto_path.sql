-- =====================================================================
-- 0034_certificate_pgcrypto_path.sql · Sửa lỗi cấp chứng chỉ.
-- Lỗi: fn_issue_certificate / fn_issue_certificate_for_exam gọi gen_random_bytes() (pgcrypto)
-- nhưng search_path = public, mà trên Supabase pgcrypto nằm ở schema "extensions"
-- → "function gen_random_bytes(integer) does not exist" → học viên thi đạt cuối khóa
-- thì nộp bài lỗi, không nhận được chứng chỉ. Sửa: thêm schema extensions vào search_path.
-- =====================================================================

alter function fn_issue_certificate_for_exam(uuid, uuid, text, integer, integer, uuid)
  set search_path = public, extensions;

do $$
declare f regprocedure;
begin
  -- fn_issue_certificate có thể là hàm trigger hoặc có tham số → đổi cho mọi overload.
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'fn_issue_certificate' loop
    execute format('alter function %s set search_path = public, extensions', f);
  end loop;
end $$;
