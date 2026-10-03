-- =====================================================================
-- 0024_unique_course_title.sql · Bảo đảm tên khóa học không bị trùng.
-- Không phân biệt hoa/thường và bỏ qua khoảng trắng thừa.
-- =====================================================================

create unique index uq_courses_title_normalized
  on courses (lower(regexp_replace(btrim(title), '\s+', ' ', 'g')));
