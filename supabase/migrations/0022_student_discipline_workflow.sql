-- 0022_student_discipline_workflow.sql
-- Giảng viên đề xuất kỷ luật học viên; admin phê duyệt và ghi nhật ký.

alter type enrollment_status add value if not exists 'suspended';
alter type enrollment_status add value if not exists 'expelled';

create table if not exists student_discipline_request (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  requested_by uuid not null references profiles(id) on delete cascade,
  action text not null check (action in ('warning', 'suspend', 'expel')),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_student_discipline_course on student_discipline_request(course_id, status);
create index if not exists idx_student_discipline_student on student_discipline_request(student_id, created_at desc);

alter table student_discipline_request enable row level security;
drop policy if exists student_discipline_select on student_discipline_request;
create policy student_discipline_select on student_discipline_request for select using (
  student_id = auth.uid() or fn_owns_course(course_id) or fn_is_admin()
);

create or replace function fn_request_student_discipline(
  p_enrollment uuid,
  p_action text,
  p_reason text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_student uuid; v_course uuid; v_title text; v_request uuid; v_reason text := nullif(trim(p_reason), '');
begin
  if auth.uid() is null then raise exception 'Vui lòng đăng nhập'; end if;
  if p_action not in ('warning', 'suspend', 'expel') then raise exception 'Hình thức xử lý không hợp lệ'; end if;
  if v_reason is null then raise exception 'Vui lòng nhập lý do xử lý'; end if;
  select e.user_id, e.course_id, c.title into v_student, v_course, v_title
    from enrollments e join courses c on c.id = e.course_id
    where e.id = p_enrollment and e.status = 'active';
  if not found then raise exception 'Không tìm thấy học viên đang học'; end if;
  if not fn_owns_course(v_course) then raise exception 'Chỉ giảng viên phụ trách khóa học mới được đề xuất xử lý'; end if;
  if exists (select 1 from student_discipline_request where enrollment_id = p_enrollment and status = 'pending') then
    raise exception 'Học viên đã có một yêu cầu xử lý đang chờ admin';
  end if;
  insert into student_discipline_request (enrollment_id, student_id, course_id, requested_by, action, reason)
    values (p_enrollment, v_student, v_course, auth.uid(), p_action, v_reason) returning id into v_request;
  insert into notification (user_id, type, title, body)
    select id, 'system', 'Yêu cầu xử lý học viên cần phê duyệt',
      'Giảng viên đề xuất ' || case p_action when 'warning' then 'cảnh cáo' when 'suspend' then 'đình chỉ học' else 'đuổi học' end ||
      ' học viên trong khóa "' || coalesce(v_title, '') || '".'
    from profiles where role in ('admin', 'super_admin') and not is_banned;
  return v_request;
end $$;

create or replace function fn_review_student_discipline(
  p_request uuid,
  p_approve boolean,
  p_review_reason text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_student uuid; v_course uuid; v_enrollment uuid; v_action text; v_reason text; v_title text; v_log text;
begin
  if not fn_is_admin() then raise exception 'Chỉ admin được phê duyệt xử lý học viên'; end if;
  select student_id, course_id, enrollment_id, action, reason into v_student, v_course, v_enrollment, v_action, v_reason
    from student_discipline_request where id = p_request and status = 'pending' for update;
  if not found then raise exception 'Không tìm thấy yêu cầu xử lý đang chờ'; end if;
  select title into v_title from courses where id = v_course;
  if p_approve then
    update student_discipline_request set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_reason = nullif(trim(p_review_reason), '') where id = p_request;
    if v_action = 'suspend' then update enrollments set status = 'suspended' where id = v_enrollment;
    elsif v_action = 'expel' then update enrollments set status = 'expelled' where id = v_enrollment;
    end if;
    v_log := 'approve_student_' || v_action;
    insert into notification (user_id, type, title, body) values (v_student, 'system', 'Xử lý học viên đã được phê duyệt', 'Khóa học: "' || coalesce(v_title, '') || '" — ' || case v_action when 'warning' then 'cảnh cáo' when 'suspend' then 'đình chỉ học' else 'đuổi học' end || '.');
  else
    update student_discipline_request set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_reason = nullif(trim(p_review_reason), '') where id = p_request;
    v_log := 'reject_student_' || v_action;
    insert into notification (user_id, type, title, body) values (v_student, 'system', 'Yêu cầu xử lý học viên bị từ chối', 'Khóa học: "' || coalesce(v_title, '') || '".');
  end if;
  perform fn_log_activity(v_log, 'student_discipline', p_request, p_review_reason, jsonb_build_object('course_id', v_course, 'student_id', v_student, 'enrollment_id', v_enrollment, 'discipline_action', v_action));
end $$;
