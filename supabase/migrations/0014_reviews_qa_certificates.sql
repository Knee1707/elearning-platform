-- =====================================================================
-- 0014_reviews_qa_certificates.sql  ·  Chủ: LEADER (L)
-- 1) Review: học viên viết/sửa review → chờ duyệt; không tự đổi status.
-- 2) Kiểm duyệt Q&A: admin xóa câu hỏi/trả lời vi phạm (có lý do, có log).
-- 3) Thu hồi chứng chỉ: cột revoked_at/revoked_reason + fn_revoke_certificate;
--    fn_verify_certificate trả thêm revoked_at để trang /verify báo đã thu hồi.
-- 4) courses.moderation_note: lưu lý do từ chối/ẩn để giảng viên thấy trong Studio.
-- Chạy SAU 0013.
-- =====================================================================

-- ------------------------------------------------------------------ --
-- 1) REVIEW
-- ------------------------------------------------------------------ --
alter table reviews alter column status set default 'pending';

-- Policy reviews_update_own cho học viên sửa CẢ cột status → tự duyệt review của mình.
-- Trigger này: client không phải admin → review mới / review sửa nội dung luôn về 'pending',
-- còn đổi riêng status thì bị giữ nguyên. Admin đổi status qua fn_moderate_review (definer).
create or replace function fn_guard_review_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or fn_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
  elsif new.rating is distinct from old.rating or new.comment is distinct from old.comment then
    new.status := 'pending';
  else
    new.status := old.status;
  end if;
  return new;
end $$;

drop trigger if exists trg_reviews_guard_status on reviews;
create trigger trg_reviews_guard_status
  before insert or update on reviews
  for each row execute function fn_guard_review_status();

-- ------------------------------------------------------------------ --
-- 2) KIỂM DUYỆT Q&A
-- ------------------------------------------------------------------ --
create or replace function fn_moderate_qa(p_entity text, p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_reason  text := nullif(trim(p_reason), '');
  v_author  uuid;
  v_content text;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if v_reason is null then raise exception 'Cần nhập lý do khi xóa nội dung'; end if;

  if p_entity = 'question' then
    delete from qa_question where id = p_id returning user_id, content into v_author, v_content;
  elsif p_entity = 'answer' then
    delete from qa_answer where id = p_id returning user_id, content into v_author, v_content;
  else
    raise exception 'Loại nội dung không hợp lệ';
  end if;
  if v_author is null then raise exception 'Không tìm thấy nội dung (có thể đã bị xóa)'; end if;

  insert into notification (user_id, type, title, body)
    values (v_author, 'system',
            case p_entity when 'question' then 'Câu hỏi của bạn đã bị gỡ' else 'Câu trả lời của bạn đã bị gỡ' end,
            '"' || left(v_content, 120) || '" — Lý do: ' || v_reason);

  perform fn_log_activity('delete_qa', 'qa_' || p_entity, p_id, v_reason,
                          jsonb_build_object('author_id', v_author, 'content', left(v_content, 200)));
end $$;

-- ------------------------------------------------------------------ --
-- 3) THU HỒI CHỨNG CHỈ
-- ------------------------------------------------------------------ --
alter table certificates add column if not exists revoked_at     timestamptz;
alter table certificates add column if not exists revoked_reason text;

create or replace function fn_revoke_certificate(p_certificate uuid, p_reason text, p_revoke boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cert   certificates%rowtype;
  v_title  text;
  v_reason text := nullif(trim(p_reason), '');
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  if p_revoke and v_reason is null then raise exception 'Cần nhập lý do thu hồi'; end if;

  select * into v_cert from certificates where id = p_certificate for update;
  if not found then raise exception 'Không tìm thấy chứng chỉ'; end if;
  if p_revoke and v_cert.revoked_at is not null then raise exception 'Chứng chỉ đã bị thu hồi'; end if;
  if not p_revoke and v_cert.revoked_at is null then raise exception 'Chứng chỉ đang còn hiệu lực'; end if;

  update certificates
    set revoked_at     = case when p_revoke then now() else null end,
        revoked_reason = case when p_revoke then v_reason else null end
    where id = p_certificate;

  select title into v_title from courses where id = v_cert.course_id;
  insert into notification (user_id, type, title, body)
    values (v_cert.user_id, 'system',
            case when p_revoke then 'Chứng chỉ của bạn đã bị thu hồi' else 'Chứng chỉ của bạn đã được khôi phục' end,
            '"' || coalesce(v_title, '') || '" (' || v_cert.code || ')' || coalesce(' — Lý do: ' || v_reason, ''));

  perform fn_log_activity(case when p_revoke then 'revoke_certificate' else 'restore_certificate' end,
                          'certificate', p_certificate, v_reason, jsonb_build_object('code', v_cert.code));
end $$;

-- Đổi kiểu trả về (thêm revoked_at) → phải drop rồi tạo lại. Vẫn công khai (không cần đăng nhập).
drop function if exists fn_verify_certificate(text);
create or replace function fn_verify_certificate(p_code text)
returns table (
  certificate_code text,
  student_name     text,
  course_title     text,
  issued_at        timestamptz,
  revoked_at       timestamptz
)
language sql stable security definer set search_path = public
as $$
  select c.code, p.full_name, cr.title, c.issued_at, c.revoked_at
  from certificates c
  join profiles p  on p.id  = c.user_id
  join courses  cr on cr.id = c.course_id
  where c.code = upper(p_code);
$$;

-- Thêm cột revoked_at vào CUỐI view (create or replace chỉ cho thêm cột ở cuối).
create or replace view view_certificate with (security_invoker = true) as
select
  c.id,
  c.code,
  c.issued_at,
  c.user_id,
  p.full_name       as student_name,
  c.course_id,
  cr.title          as course_title,
  cr.instructor_id,
  ip.full_name      as instructor_name,
  c.revoked_at
from certificates c
join profiles p   on p.id  = c.user_id
join courses  cr  on cr.id = c.course_id
join profiles ip  on ip.id = cr.instructor_id;

-- ------------------------------------------------------------------ --
-- 4) LÝ DO TỪ CHỐI/ẨN KHÓA HỌC HIỂN THỊ CHO GIẢNG VIÊN
--    (activity_log chỉ admin đọc được → lưu thêm vào courses.moderation_note)
-- ------------------------------------------------------------------ --
alter table courses add column if not exists moderation_note text;

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

  update courses
    set status = p_status,
        moderation_note = case when p_status in ('rejected', 'hidden') then v_reason else null end
    where id = p_course;
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
