-- Trả về các payment id vừa tạo để hiển thị biên nhận QR sau checkout.
drop function if exists fn_mock_purchase(uuid[], text);

create or replace function fn_mock_purchase(p_course_ids uuid[], p_coupon_code text default null)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare
  v_uid          uuid := auth.uid();
  v_course       record;
  v_coupon       coupon%rowtype;
  v_amount       numeric(12,2);
  v_payment_id   uuid;
  v_payment_ids  uuid[] := '{}';
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
      continue;
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
      values (v_uid, v_course.id, v_coupon.id, v_amount, 'mock', 'paid')
      returning id into v_payment_id;
    v_payment_ids := array_append(v_payment_ids, v_payment_id);
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

  return v_payment_ids;
end $$;

grant execute on function fn_mock_purchase(uuid[], text) to authenticated;