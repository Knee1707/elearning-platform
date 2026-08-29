# START HERE — mỗi người bắt đầu từ đây

> Đọc `CONVENTIONS.md` (quy ước) + `DATA_DICTIONARY.md` (tên) **trước khi gõ code**.
> Chạy `pnpm install` một lần (tự cài git hook chặn đặt tên sai).

## Cài & chạy (mọi người, 1 lần)

```bash
# Node >= 20 (có nvm thì: nvm use). Bật pnpm:
corepack enable
pnpm install       # cài deps + git hook (core.hooksPath = .githooks)
cp .env.local.example .env.local   # điền URL + ANON_KEY
npx supabase@latest start && npx supabase@latest db reset   # dựng DB
pnpm dev           # http://localhost:3000
```

Trước khi commit, hook tự chạy `naming-guard`. Muốn tự kiểm: `pnpm check:names`.

---

## 🟦 L — Leader (ĐÃ XONG khung)

- Sở hữu: `0001/0002/0003/0006`, `lib/supabase`, `lib/queries/{commerce,admin,auth}.ts`, `types`, `components/ui`, config, CI, hook.
- Còn lại: tạo repo GitHub + Issue mỗi lá + review PR + deploy Vercel.

## 🟩 M1 — Data · Nội dung

- **File của bạn:** `supabase/migrations/0004_content_logic.sql` (đã có template — bỏ comment, điền) · `lib/queries/courses.ts` · phần **M1** trong `seed.sql`.
- **Việc:** viết `view_course_catalog`, `fn_search_courses`, `view_course_detail`, `view_course_rating`, `view_instructor_stats`, `fn_apply_coupon` (đúng tên/tham số ở `DATA_DICTIONARY.md` mục 5).
- **Thứ tự:** seed nội dung → viết view/hàm → sửa 4 stub trong `courses.ts` (bỏ `throw`, gọi rpc/select thật) → 3 query mẫu nộp.
- **Cấm:** đụng bảng học tập (M2), viết UI (M3/M4), tự đặt tên ngoài sổ.

## 🟨 M2 — Data · Học tập & Điểm danh

- **File của bạn:** `supabase/migrations/0005_learning_logic.sql` (template sẵn) · `lib/queries/{progress,quiz,attendance,qa}.ts` · phần **M2** trong `seed.sql`.
- **Việc:** hàm/trigger ở `DATA_DICTIONARY.md` mục 6. Nhớ: `fn_get_quiz` KHÔNG trả `is_correct`; `trg_attendance_on_video` đọc ngưỡng từ `system_setting`.
- **Thứ tự:** tiến độ → chấm điểm → chứng chỉ → điểm danh → Q&A/thông báo → seed → sửa các stub trong 4 file query.

## 🟪 M3 — App · Học viên

- **File của bạn:** `app/(student)/` (gồm `live/[id]/join/route.ts`) · `features/{lesson,cart,live/join,quiz/take,certificate}` · `components/shared` · `globals.css`.
- **Việc:** khám phá/tìm/lọc, player (báo % → điểm danh), giỏ hàng + coupon, làm quiz/thi, chứng chỉ + verify, thông báo, review.
- **Quy tắc sắt:** **chỉ gọi hàm trong `lib/queries`**, KHÔNG viết SQL. Chờ M1/M2 xong hàm thì thay chỗ `throw TODO`.

## 🟫 M4 — App · Giảng viên / Admin

- **File của bạn:** `app/(auth)/` · `app/(instructor)/` · `app/(admin)/` · `features/{course,live/manage,quiz/author}`.
- **Việc:** auth pages, studio (CRUD khóa/chương/bài, kéo-thả `@dnd-kit`, publish), buổi live + bảng điểm danh, admin (duyệt khóa/review, user, coupon, payout, dashboard), mock checkout.
- **Có sẵn để dùng:** `lib/queries/admin.ts` (L đã viết) cho trang admin; `lib/queries/commerce.ts` cho checkout.

---

## BẢN ĐỒ FILE — mở đúng file, chỉ điền logic

> Mọi file đã tạo sẵn (skeleton + `// TODO(Mx)` + ghi rõ gọi hàm nào). Không tạo file mới.

**M1 (2 file):** `supabase/migrations/0004_content_logic.sql` · `src/lib/queries/courses.ts` (+ phần M1 trong `seed.sql`).

**M2 (5 file):** `supabase/migrations/0005_learning_logic.sql` · `src/lib/queries/{progress,quiz,attendance,qa}.ts` (+ phần M2 trong `seed.sql`).

**M3 — học viên:**
| Màn hình | File |
|---|---|
| Trang chủ | `src/app/page.tsx` |
| Duyệt/tìm khóa | `src/app/(student)/courses/page.tsx` |
| Chi tiết khóa | `src/app/(student)/courses/[slug]/page.tsx` |
| Học (player) | `src/app/(student)/learn/[courseId]/page.tsx` |
| Giỏ hàng | `src/app/(student)/cart/page.tsx` |
| Khóa của tôi | `src/app/(student)/my/page.tsx` |
| Chứng chỉ | `src/app/(student)/certificates/page.tsx` |
| Verify (công khai) | `src/app/verify/[code]/page.tsx` |
| Thông báo | `src/app/(student)/notifications/page.tsx` |
| Hồ sơ | `src/app/(student)/profile/page.tsx` |
| Vào học live | `src/app/(student)/live/[id]/join/route.ts` |
| Component | `src/components/shared/{Navbar,CourseCard}.tsx` · `src/features/{lesson,cart,quiz/take,certificate}/*` |

**M4 — giảng viên / admin / auth:**
| Màn hình | File |
|---|---|
| Đăng nhập/ký/quên MK | `src/app/(auth)/{login,register,forgot-password}/page.tsx` |
| Studio (danh sách) | `src/app/(instructor)/studio/page.tsx` |
| Tạo khóa | `src/app/(instructor)/studio/new/page.tsx` |
| Sửa khóa | `src/app/(instructor)/studio/[courseId]/page.tsx` |
| Buổi live + điểm danh | `src/app/(instructor)/live/page.tsx` |
| Payout | `src/app/(instructor)/payout/page.tsx` |
| Dashboard | `src/app/(admin)/admin/page.tsx` |
| Duyệt khóa | `src/app/(admin)/admin/courses/page.tsx` |
| Người dùng | `src/app/(admin)/admin/users/page.tsx` |
| Coupon + payout | `src/app/(admin)/admin/coupons/page.tsx` |
| Báo cáo + review | `src/app/(admin)/admin/reports/page.tsx` |
| Mock checkout | `src/app/checkout/page.tsx` |
| Component | `src/features/{course,live/manage,quiz/author}/*` |

---

## Luật chung chống hủy dự án

1. 1 PR = 1 issue, chỉ sửa file của mình.
2. Không sửa `0001/0002/0003/0006` (đã đóng băng). Cần đổi schema → migration MỚI.
3. Không tự đặt tên ngoài `DATA_DICTIONARY.md` (hook chặn commit + chặn cả Claude Code).
4. Không commit `.env.local`. Không `drop table`/`truncate` trong migration.
5. Đụng schema → đọc `DATA_DICTIONARY.md` trước.
