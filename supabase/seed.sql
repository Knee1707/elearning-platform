-- =====================================================================
-- seed.sql  ·  Chạy sau migrations (supabase db reset)
-- Chia 3 phần: L (cấu hình) · M1 (nội dung) · M2 (học tập).
-- Mỗi người CHỈ điền phần của mình, không đụng phần người khác.
-- =====================================================================

-- ============================ L — CẤU HÌNH ========================== --
-- system_setting: key là PK not-null → on conflict do nothing an toàn.
insert into system_setting (key, value) values
  ('platform_fee_percent',       '20'::jsonb),   -- % nền tảng giữ lại khi payout
  ('attendance_video_percent',   '95'::jsonb),   -- ngưỡng % xem video để tự điểm danh
  ('default_exam_pass_score',    '50'::jsonb),   -- điểm đạt mặc định
  ('currency',                   '"VND"'::jsonb)
on conflict (key) do nothing;

-- LƯU Ý: tài khoản admin KHÔNG seed bằng SQL (mật khẩu do Supabase Auth quản lý).
-- Cách tạo admin:
--   1) Đăng ký 1 user qua app (hoặc Supabase Studio › Authentication › Add user).
--   2) Chạy: update profiles set role = 'admin' where id = '<uuid user đó>';
-- (Trigger trg_profile_on_signup đã tự tạo dòng profiles khi user đăng ký.)


-- ============================ M1 — NỘI DUNG ========================= --
-- TODO (M1): categories + tag + 3–5 khóa × chương × bài + attachments
--            + 2 coupon (1 percent, 1 fixed) + vài review mẫu.
-- Gợi ý idempotent: insert ... select ... where not exists (...).


-- ======================= M2 — HỌC TẬP / ĐIỂM DANH =================== --
-- TODO (M2): enrollment + lesson_progress + quiz/câu hỏi/đáp án + exam_attempt
--            + 1 certificate + live_session + attendance mẫu + qa + note.
