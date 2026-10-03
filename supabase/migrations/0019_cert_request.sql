-- =====================================================================
-- 0019_cert_request.sql  ·  Chứng chỉ theo cơ chế XIN → ADMIN DUYỆT
-- Trước đây: thi đạt là TỰ ĐỘNG cấp chứng chỉ (trg_issue_certificate).
-- Nay: học viên "Xin cấp chứng chỉ" (khi đã đạt) → trạng thái 'pending' →
-- admin duyệt mới 'approved' (mới xác thực QR được). Chạy SAU 0014.
-- =====================================================================

-- 1) Trạng thái duyệt. Chứng chỉ cũ (đã cấp) mặc định 'approved' để không gãy.
alter table certificates add column if not exists status text not null default 'approved';
-- Tương thích với các database đã đánh dấu 0014 nhưng thiếu cột thu hồi.
alter table certificates add column if not exists revoked_at timestamptz;
alter table certificates add column if not exists revoked_reason text;

-- 2) Ngừng tự động cấp — chuyển sang cơ chế xin/duyệt.
drop trigger if exists trg_issue_certificate on exam_attempts;

-- 3) Học viên xin cấp chứng chỉ: phải đang học + đã ĐẠT bài thi của khóa.
create or replace function fn_request_certificate(p_course uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_code text; v_existing text; v_title text;
begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập'; end if;
  if not fn_is_enrolled(p_course) then raise exception 'Bạn chưa tham gia khóa học này'; end if;

  if not exists (
    select 1 from exam_attempts a join exams e on e.id = a.exam_id
    where e.course_id = p_course and a.user_id = auth.uid()
      and a.score is not null and a.score >= e.pass_score
  ) then
    raise exception 'Bạn cần vượt qua bài thi của khóa trước khi xin cấp chứng chỉ';
  end if;

  select status into v_existing from certificates where user_id = auth.uid() and course_id = p_course;
  if v_existing = 'approved' then raise exception 'Bạn đã có chứng chỉ của khóa này'; end if;
  if v_existing = 'pending'  then raise exception 'Yêu cầu của bạn đang chờ admin duyệt'; end if;

  v_code := upper(encode(gen_random_bytes(8), 'hex'));
  insert into certificates (user_id, course_id, code, status)
    values (auth.uid(), p_course, v_code, 'pending')
  on conflict (user_id, course_id) do update set status = 'pending';

  select title into v_title from courses where id = p_course;
  insert into notification (user_id, type, title, body)
    values (auth.uid(), 'system', 'Đã gửi yêu cầu cấp chứng chỉ',
            'Khóa "' || coalesce(v_title, '') || '" — chờ admin duyệt.');
end $$;

-- 4) Admin duyệt / từ chối yêu cầu cấp chứng chỉ.
create or replace function fn_review_certificate(p_certificate uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_course uuid; v_code text; v_title text;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin'; end if;
  select user_id, course_id, code into v_user, v_course, v_code
    from certificates where id = p_certificate and status = 'pending';
  if not found then raise exception 'Không tìm thấy yêu cầu chờ duyệt'; end if;
  select title into v_title from courses where id = v_course;

  if p_approve then
    update certificates set status = 'approved', issued_at = now() where id = p_certificate;
    insert into notification (user_id, type, title, body)
      values (v_user, 'system', 'Chứng chỉ đã được cấp',
              'Khóa "' || coalesce(v_title, '') || '" — mã: ' || v_code);
  else
    delete from certificates where id = p_certificate;
    insert into notification (user_id, type, title, body)
      values (v_user, 'system', 'Yêu cầu cấp chứng chỉ bị từ chối',
              'Khóa "' || coalesce(v_title, '') || '".');
  end if;
end $$;

-- 5) Xác thực công khai CHỈ chứng chỉ đã duyệt (pending không tra cứu được).
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
  where c.code = upper(p_code) and c.status = 'approved';
$$;
