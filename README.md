# LMS Đào tạo

Đồ án LMS — nền tảng học trực tuyến (học viên · giảng viên · admin).
Bộ khung do **Leader (L)** dựng. **Thành viên bắt đầu từ [`docs/START-HERE.md`](docs/START-HERE.md).**
Quy ước: `CONVENTIONS.md` · Tên chuẩn: `DATA_DICTIONARY.md`.

## Stack (khóa version — xem `package.json`)

Next.js 14.2.3 · React 18.3.1 · TypeScript 5.4.5 · Tailwind 3.4.3 + shadcn/ui ·
Supabase (Postgres 15) · Zod · react-hook-form · pnpm 9 · Node 20.13.1.

## Chạy lần đầu

```bash
# 1) Node >= 20 (khuyến nghị 20.13.1). Có nvm thì: nvm use

# 2) Bật pnpm bằng corepack (đi kèm Node, không cần cài thêm)
corepack enable

# 3) Cài deps
pnpm install

# 3) Biến môi trường
cp .env.local.example .env.local
#   điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4) Database (chọn 1 trong 2)
#   a) Supabase local (cần Docker):
npx supabase@latest start
npx supabase@latest db reset          # chạy migrations 0001..0010 + seed.sql
#   b) Hoặc dán nội dung supabase/migrations/*.sql vào SQL Editor trên Supabase Cloud
#      theo đúng thứ tự 0001 → 0002 → … → 0010 (mỗi file 1 lần chạy riêng), rồi chạy seed.sql

# 5) Sinh kiểu TypeScript từ schema (tùy chọn, sau khi có DB)
pnpm db:types

# 6) Chạy app
pnpm dev                               # http://localhost:3000
```

## Tạo tài khoản quản trị

Có 2 cấp: `admin` (kiểm duyệt, quản lý học viên/giảng viên) và `super_admin`
(thêm: cấp/thu hồi admin, cấu hình hệ thống, duyệt hoàn tiền, payout).

1. Đăng ký 1 user (app hoặc Supabase Studio › Authentication › Add user).
2. Tạo **super admin đầu tiên** bằng SQL (chạy trong SQL Editor, quyền postgres):
   `update profiles set role = 'super_admin' where id = '<uuid user>';`
3. Các admin sau đó do super admin cấp ở trang **/admin/users**.

> Client không thể tự đổi `role`/`is_banned` (trigger `trg_profiles_guard_privilege`) —
> chỉ qua `fn_set_role` / `fn_toggle_ban` hoặc SQL Editor.

## Thứ tự migration (QUAN TRỌNG)

| File | Chủ | Nội dung |
|---|---|---|
| `0001_init.sql` | L | enum + hàm quyền + profiles, system_setting, activity_log, coupon |
| `0002_content.sql` | L | categories, tag, courses, chapters, lessons, attachments, reviews |
| `0003_commerce_learning.sql` | L | enrollments, cart, wishlist, payments, refund, payout + toàn bộ bảng học tập/điểm danh |
| `0004_content_logic.sql` | **M1** | view/hàm nội dung (template sẵn — M1 bỏ comment & điền) |
| `0005_learning_logic.sql` | **M2** | hàm/trigger học tập, chấm điểm, điểm danh (template sẵn — M2 điền) |
| `0006_spine_logic.sql` | L | fn_mock_purchase, payout, refund, moderation, dashboard, trigger signup |
| `0007` · `0008` | L | hotfix bảo vệ nội dung trả phí · biên nhận checkout |
| `0009_super_admin_role.sql` | L | thêm giá trị enum `super_admin` (**chạy riêng, trước 0010**) |
| `0010_admin_permissions.sql` | L | phân quyền Admin/Super Admin, chống leo thang quyền, audit log |

> Bảng thương mại tham chiếu `courses` nên phải tạo sau `courses` → thứ tự trên là bắt buộc.

## Kiểm tra chất lượng

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Các lệnh này chạy tự động trên mọi PR (`.github/workflows/ci.yml`). Giữ `main` luôn xanh.

## Hook chống đặt tên sai / hủy dự án

`scripts/naming-guard.mjs` chặn: bảng/enum/hàm/view đặt sai tên (không có trong `DATA_DICTIONARY.md`),
sai tiền tố (`fn_`/`view_`/`trg_`/`idx_`), `drop table`/`truncate`, commit `.env.local`, sửa migration đã đóng băng.

Chạy 3 nơi:
- **Git pre-commit:** tự bật sau `pnpm install` (cài `.githooks`). Commit sai tên → bị chặn.
- **CI:** bước "Naming guard" trong `ci.yml`.
- **Claude Code:** `.claude/settings.json` (PreToolUse) — chặn ngay khi ghi file sai tên.

Tự kiểm tay: `pnpm check:names`. Cần tên mới → thêm vào `DATA_DICTIONARY.md` + danh sách trong `scripts/naming-guard.mjs`.

---

## AI LÀM GÌ — VÀO ĐÚNG FILE

> Mọi file đã tạo sẵn skeleton (chạy được, có `// TODO(Mx)` + ghi rõ gọi hàm nào).
> **Chỉ mở đúng file của mình, xóa TODO, điền logic. KHÔNG tạo file mới, KHÔNG đổi tên** (xem `DATA_DICTIONARY.md`).

### 🟩 M1 — Data · Nội dung
| File | Việc |
|---|---|
| `supabase/migrations/0004_content_logic.sql` | Bỏ comment, viết `view_course_catalog`, `fn_search_courses`, `view_course_detail`, `view_course_rating`, `view_instructor_stats`, `fn_apply_coupon` |
| `src/lib/queries/courses.ts` | Xóa `throw TODO`, gọi thật các view/hàm trên |
| `supabase/seed.sql` (phần **M1**) | categories, tag, 3–5 khóa × chương × bài, attachments, coupon, review mẫu |

### 🟨 M2 — Data · Học tập & Điểm danh
| File | Việc |
|---|---|
| `supabase/migrations/0005_learning_logic.sql` | Hàm/trigger: tiến độ, chấm điểm, chứng chỉ, điểm danh, Q&A, thông báo |
| `src/lib/queries/progress.ts` | `updateWatch`, `savePosition`, `markComplete`, `getCourseProgress` |
| `src/lib/queries/quiz.ts` | `getQuiz` (ẩn `is_correct`), `submitAttempt`, `verifyCertificate` |
| `src/lib/queries/attendance.ts` | `joinLiveSession`, `getMyAttendance`, `getClassAttendance` |
| `src/lib/queries/qa.ts` | `addNote`, `askQuestion`, `answerQuestion`, `markRead` |
| `supabase/seed.sql` (phần **M2**) | enrollment, progress, quiz, attempt, certificate, live, attendance, qa, note mẫu |

### 🟪 M3 — App · Học viên
| Màn hình | File | Gọi hàm |
|---|---|---|
| Trang chủ | `src/app/page.tsx` | getCourseCatalog |
| Duyệt/tìm khóa | `src/app/(student)/courses/page.tsx` | getCourseCatalog, searchCourses |
| Chi tiết khóa | `src/app/(student)/courses/[slug]/page.tsx` | getCourseDetail, addToCart, toggleWishlist |
| Học (player) | `src/app/(student)/learn/[courseId]/page.tsx` | updateWatch, markComplete, getCourseProgress |
| Giỏ hàng | `src/app/(student)/cart/page.tsx` | applyCoupon, mockPurchase |
| Khóa của tôi | `src/app/(student)/my/page.tsx` | getCourseProgress |
| Chứng chỉ | `src/app/(student)/certificates/page.tsx` | — |
| Verify (công khai) | `src/app/verify/[code]/page.tsx` | verifyCertificate |
| Thông báo | `src/app/(student)/notifications/page.tsx` | markRead |
| Hồ sơ | `src/app/(student)/profile/page.tsx` | getMyProfile |
| Vào học live | `src/app/(student)/live/[id]/join/route.ts` | joinLiveSession |
| Component | `src/components/shared/{Navbar,CourseCard}.tsx` · `src/features/{lesson,cart,quiz/take,certificate}/*` | — |

### 🟫 M4 — App · Giảng viên / Admin
| Màn hình | File | Gọi hàm |
|---|---|---|
| Đăng nhập/ký/quên MK | `src/app/(auth)/{login,register,forgot-password}/page.tsx` | Supabase Auth |
| Studio (danh sách khóa) | `src/app/(instructor)/studio/page.tsx` | — |
| Tạo khóa | `src/app/(instructor)/studio/new/page.tsx` | (CourseForm) |
| Sửa khóa | `src/app/(instructor)/studio/[courseId]/page.tsx` | (CourseForm, QuizAuthor) |
| Buổi live + điểm danh | `src/app/(instructor)/live/page.tsx` | getClassAttendance |
| Payout | `src/app/(instructor)/payout/page.tsx` | — (view_instructor_payout) |
| Dashboard | `src/app/(admin)/admin/page.tsx` | getAdminDashboard |
| Duyệt khóa | `src/app/(admin)/admin/courses/page.tsx` | moderateCourse |
| Người dùng | `src/app/(admin)/admin/users/page.tsx` | setRole, toggleBan |
| Coupon + payout | `src/app/(admin)/admin/coupons/page.tsx` | generatePayout |
| Báo cáo + review | `src/app/(admin)/admin/reports/page.tsx` | resolveReport, moderateReview |
| Mock checkout | `src/app/checkout/page.tsx` | mockPurchase |
| Component | `src/features/{course,live/manage,quiz/author}/*` | — |

> Hàm `M1/M2` nằm ở `lib/queries` (họ điền). Hàm `L` (`commerce.ts`, `admin.ts`, `auth.ts`) **đã viết sẵn** — M3/M4 gọi được ngay.

### 🟦 L — Leader (đã xong khung)
Tạo repo + Issue mỗi màn (theo bảng trên) + review PR + deploy. Không sửa `0001/0002/0003/0006` (đã đóng băng).
