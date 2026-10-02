-- =====================================================================
-- 0009_super_admin_role.sql  ·  Chủ: LEADER (L)
-- Thêm vai trò 'super_admin' vào enum user_role.
--
-- TÁCH RIÊNG FILE: Postgres không cho DÙNG giá trị enum mới trong cùng
-- transaction vừa thêm nó ("unsafe use of new value"). Mọi hàm/policy dùng
-- 'super_admin' nằm ở 0010_admin_permissions.sql (chạy SAU file này).
-- Nếu chạy tay trên SQL Editor: chạy file này xong rồi mới chạy 0010.
-- =====================================================================

alter type user_role add value if not exists 'super_admin';
