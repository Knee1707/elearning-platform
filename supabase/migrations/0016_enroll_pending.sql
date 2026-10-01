-- =====================================================================
-- 0016_enroll_pending.sql  ·  Duyệt học viên vào lớp (khóa miễn phí)
-- Thêm trạng thái ghi danh 'pending' (chờ giảng viên duyệt).
-- TÁCH FILE: Postgres không cho dùng giá trị enum mới trong cùng transaction
-- vừa thêm. Logic dùng 'pending' nằm ở 0017 (chạy SAU file này).
-- =====================================================================

alter type enrollment_status add value if not exists 'pending';
