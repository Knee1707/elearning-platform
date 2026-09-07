-- =====================================================================
-- 0004_content_logic.sql  ·  Chủ: M1
-- View/hàm nội dung. BỎ COMMENT từng khối rồi ĐIỀN THÂN.
-- Dùng ĐÚNG tên trong DATA_DICTIONARY.md (hook sẽ chặn nếu sai).
-- Chạy sau 0003, trước 0006.
-- =====================================================================

-- ------------------------------------------------------------------ --
-- view_course_catalog — khóa đã publish cho trang chủ / trang duyệt
--   Cột gợi ý: id, title, slug, price, level, thumbnail_url, is_featured,
--              instructor_name, avg_rating, rating_count, created_at
-- ------------------------------------------------------------------ --
-- hàm hiển tạo view danh sách các khoá học đã được publish
-- trả về các thông tin cơ bản như id, title, slug, price,level, tên instructor, ảnh dại diện và
-- trạng thái nổi bật ,... điểm tb, thời gian tạo khoá học
create or replace view view_course_catalog
with (security_invoker = true) as
select c.id,
	   c.instructor_id,
	   c.category_id,
	   c.title,
	   c.slug,
	   c.description,
	   c.price,
	   c.level,
	   c.status,
	   c.thumbnail_url,
	   c.is_featured,
	   c.updated_at,
	   p.full_name as instructor_name,
	   coalesce(round(avg(r.rating), 1), 0::numeric) as avg_rating,-- review bị ẩn sẽ không được tính điểm
	   count(r.id)::integer as rating_count,
	   c.created_at
from courses c
join profiles p on p.id = c.instructor_id
left join reviews r on r.course_id = c.id and r.status = 'visible'  
where c.status = 'published'-- Đặc biệt là chỉ được lấy khoá học được công khai
group by c.id, p.full_name
order by c.created_at desc;

-- ------------------------------------------------------------------ --
-- fn_search_courses(p_keyword, p_category, p_level, p_max_price, p_min_rating)
--   Full-text trên title + description, lọc động. Trả setof view_course_catalog.
-- ------------------------------------------------------------------ --
-- function này chức năng là tìm kiếm và lọc các khoá học dựa trên keyword
create or replace function fn_search_courses(
	p_keyword    text    default null,
	p_category   uuid    default null,
	p_level      text    default null,
	p_max_price  numeric default null,
	p_min_rating numeric default null
) returns setof view_course_catalog
language sql stable security invoker set search_path = public as $$
	select vc.*
	from view_course_catalog vc
	where (
		nullif(trim(p_keyword), '') is null
		or to_tsvector('simple', vc.title || ' ' || coalesce(
			(select c.description from courses c where c.id = vc.id), ''
		)) @@ plainto_tsquery('simple', trim(p_keyword))
	)
	and (
		p_category is null
		or exists (
			select 1 from courses c
			where c.id = vc.id and c.category_id = p_category -- kiểm tra khoá học có thuộc category hay không
		)
	)
	-- nếu tham số là null, điều kiện tương ứng không được áp dụng.
	and (p_level is null or vc.level = p_level)
	and (p_max_price is null or vc.price <= p_max_price)
	and (p_min_rating is null or vc.avg_rating >= p_min_rating)
	order by vc.created_at desc;
$$;

-- ------------------------------------------------------------------ --
-- view_course_detail — chi tiết 1 khóa (mô tả, GV, mục lục chương→bài)
-- view_course_rating  — course_id, avg_rating, rating_count
-- view_instructor_stats — instructor_id, student_count, revenue, completion_rate
-- fn_apply_coupon(p_code, p_course_ids) returns numeric — giá sau giảm
-- ------------------------------------------------------------------ --
-- view trả về chi tiết của một khoá học như instructor_id , danh sách chương và bài học,....
-- kết quả thích hợp để frontend lấy một lần và render
create or replace view view_course_detail
with (security_invoker = true) as
select c.id,
			 c.instructor_id,
			 c.category_id,
			 c.title,
			 c.slug,
			 c.description,
			 c.level,
			 c.price,
			 c.status,
			 c.thumbnail_url,
			 c.is_featured,
			 c.created_at,
			 c.updated_at,
			 p.full_name as instructor_name,
			 coalesce(
				 (
					 select jsonb_agg(				-- tạo json các chapter lồng nhau với payload như phía dưới
						 jsonb_build_object(
							 'id', chapter.id,
							 'course_id', chapter.course_id,
							 'title', chapter.title,
							 'position', chapter.position,
							 'lessons', coalesce(
								 (
									 select jsonb_agg(
										 jsonb_build_object(
											 'id', lesson.id,
											 'chapter_id', lesson.chapter_id,
											 'title', lesson.title,
											 'video_url', lesson.video_url,
											 'video_status', lesson.video_status,
											 'duration_seconds', lesson.duration_seconds,
											 'is_free', lesson.is_free,
											 'position', lesson.position
										 ) order by lesson.position -- sau đó
									 )
									 from lessons lesson
									 where lesson.chapter_id = chapter.id
								 ),
								 '[]'::jsonb
							 )
						 ) order by chapter.position -- sau đó sắp xếp theo position
					 )
					 from chapters chapter
					 where chapter.course_id = c.id
				 ),
				 '[]'::jsonb
			 ) as chapters
from courses c
join profiles p on p.id = c.instructor_id
where c.status = 'published'; -- lấy của những khoá học đã được publish


-- view hiển thị đánh giá khoá học
-- trả về rating được đươc được round và trả về rating của tất cả các khoá học không chỉ khoá published
create or replace view view_course_rating
with (security_invoker = true) as
select c.id as course_id,
			 coalesce(round(avg(r.rating), 1), 0::numeric) as avg_rating, 
			 count(r.id)::integer as rating_count
from courses c
left join reviews r on r.course_id = c.id and r.status = 'visible' -- chỉ được show review với status là visible
group by c.id;



--- view hiển thị trạng thái của instructor 
create or replace view view_instructor_stats
with (security_invoker = true) as
select c.instructor_id,
			 (
				 select count(distinct e.user_id)::integer -- đếm số học viên đã enroll vào các khoá học của instructor
				 from enrollments e
				 join courses enrolled_course on enrolled_course.id = e.course_id
				 where enrolled_course.instructor_id = c.instructor_id
					 and e.status = 'active' -- chỉ tính các enrollment đang active
			 ) as student_count,
			 (
				-- tính tổng doanh thu các khoa học của instructor với status là paid
				 select coalesce(sum(p.amount) filter (where p.status = 'paid'), 0::numeric) 
				 from payments p
				 join courses paid_course on paid_course.id = p.course_id
				 where paid_course.instructor_id = c.instructor_id
			 ) as revenue,
			 (
				 -- tính tỷ lệ hoàn thành các bài học.
				 select coalesce(
					 round(
						 100::numeric * count(*) filter (where lp.is_completed)
						 / nullif(count(*)::numeric, 0),
						 1
					 ),
					 0::numeric
				 )
				 from lesson_progress lp
				 join lessons lesson on lesson.id = lp.lesson_id
				 join chapters chapter on chapter.id = lesson.chapter_id
				 join courses progress_course on progress_course.id = chapter.course_id
				 where progress_course.instructor_id = c.instructor_id
			 ) as completion_rate
from courses c
group by c.instructor_id;



--- hàm kiểm tra coupon và tính giá sau giảm
create or replace function fn_apply_coupon(
	p_code text,
	p_course_ids uuid[]
) returns numeric
--- trả về một số tiền
--- plpgsql cho phép dùng biến và câu lệnh IF
--stable cho pg biết fn không thay đổi dữ liệu trong transaction
-- chạy theo quyển người gọi (security invoiker ...)
language plpgsql stable security invoker set search_path = public as $$
declare
	v_coupon coupon%rowtype;
	v_total numeric(12, 2);
begin
	select * into v_coupon
	from coupon
	-- tìm các coupon hợp lệ dựa trên code, thời gian và số lượng sử dụng
	where code = p_code
		and valid_from <= now()
		and (valid_to is null or valid_to >= now())
		and (usage_limit is null or used_count < usage_limit);

	if not found then
		raise exception 'Mã giảm giá không hợp lệ hoặc đã hết hạn';
	end if;

	select coalesce(sum(c.price), 0::numeric)
	into v_total
	from courses c
	-- chỉ lấy các khoá học có id nằm trong danh sách p_course_ids, nếu p_course_ids là null thì trả về mảng rỗng
	where c.id = any(coalesce(p_course_ids, '{}'::uuid[]))
		and c.status = 'published' -- chỉ tính các khoá học online
		and (v_coupon.instructor_id is null or c.instructor_id = v_coupon.instructor_id);

	if v_coupon.type = 'percent' then
		return round(v_total * (1 - v_coupon.value / 100), 2);
	end if;

	return greatest(round(v_total - v_coupon.value, 2), 0::numeric);
end;
$$;
