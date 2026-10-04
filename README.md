# LMS Đào tạo

Đồ án môn học: nền tảng học trực tuyến với 4 vai trò **Học viên · Giảng viên · Admin · Super Admin**.
Giảng viên soạn khóa học (video YouTube/MP4, quiz, bài thi cuối khóa), admin kiểm duyệt và xuất bản,
học viên mua khóa, học tuần tự từng bài, thi cuối khóa và nhận chứng chỉ có mã QR xác thực.

Quy ước code: [`CONVENTIONS.md`](CONVENTIONS.md) · Tên bảng/hàm chuẩn: [`DATA_DICTIONARY.md`](DATA_DICTIONARY.md).

## Stack (khóa version — xem `package.json`)

Next.js 14.2.3 (App Router) · React 18.3.1 · TypeScript 5.4.5 · Tailwind 3.4.3 + shadcn/ui ·
Supabase (Postgres 15, Auth, RLS) · Zod · react-hook-form · @dnd-kit · Recharts · pnpm 9 · Node ≥ 20.

## Tính năng

### Hai cổng truy cập

| Cổng | Lệnh chạy | Ai đăng nhập |
|---|---|---|
| Cổng người dùng — `http://localhost:3000` | `pnpm dev` | Học viên, Giảng viên |
| Cổng quản trị — `http://localhost:3001` | `pnpm dev:admin` (`NEXT_PUBLIC_APP_MODE=admin`) | Admin, Super Admin |

Cổng người dùng chặn toàn bộ trang `/admin`, `/super-admin`; cổng quản trị chỉ mở trang quản trị + đăng nhập.
Tài khoản admin đăng nhập ở cổng người dùng (và ngược lại) sẽ bị từ chối.

### Học viên

- **Khám phá khóa học:** trang chủ, danh sách khóa, tìm kiếm và lọc theo danh mục / trình độ / giá / đánh giá.
- **Chi tiết khóa học:** giới thiệu, giáo trình theo chương, **xem thử** các bài được bật "Học thử", đánh giá của học viên khác.
- **Mua khóa:** giỏ hàng, danh sách yêu thích, mã giảm giá, thanh toán mô phỏng (không xử lý tiền thật), lịch sử mua (`/my/purchases`).
  Khóa miễn phí cần giảng viên duyệt ghi danh.
- **Học:**
  - Trình phát video hỗ trợ **link YouTube** và **file video trực tiếp (MP4/WebM…)**, có tua ±10s, tốc độ phát, toàn màn hình
    và tự phát tiếp từ vị trí xem lần trước.
  - **Mở khóa tuần tự:** bài sau chỉ mở khi đã xem ≥ 95% video bài trước và đạt quiz của bài đó.
  - Quiz sau mỗi bài, ghi chú theo mốc thời gian video, hỏi đáp (Q&A) với giảng viên.
- **Thi cuối khóa:** chỉ vào thi khi đã hoàn thành mọi bài; có giới hạn thời gian; câu trắc nghiệm chấm tự động,
  câu tự luận do giảng viên chấm.
- **Chứng chỉ:** tự cấp ngay khi thi đạt; có mã QR, trang xác thực công khai `/verify/[code]`.
- Khóa học của tôi + tiến độ, nhận xét từ giảng viên, thông báo, hồ sơ cá nhân, viết đánh giá khóa học.

### Giảng viên (`/studio`)

- **Quản lý khóa học:** tạo / sửa khóa, chương và bài (kéo-thả sắp xếp), dán link video (YouTube hoặc file video),
  bật/tắt học thử, đính kèm tài liệu PDF.
- **Quiz** cho từng bài và **bài thi cuối khóa** (trắc nghiệm 4 đáp án + tự luận, thời gian làm bài, điểm đạt).
  Giảng viên phải bấm **Đăng đề** thì học viên mới thi được; chấm bài tự luận ngay trong Studio.
- **Gửi duyệt** khóa học cho admin. Khóa đã xuất bản khi sửa nội dung sẽ chuyển sang chờ duyệt cập nhật.
- **Một khóa có thể có nhiều giảng viên:** mọi giảng viên được phân công đều soạn nội dung và gửi duyệt được
  (chỉ giảng viên chính được xóa khóa).
- **Học viên:** duyệt ghi danh khóa miễn phí, theo dõi tiến độ, gửi nhận xét, đề nghị kỷ luật học viên.
- Xem đánh giá khóa học, chứng nhận đã cấp, hồ sơ giảng viên.

### Admin (`/admin`)

| Mục | Chức năng |
|---|---|
| Duyệt khóa học | Duyệt / từ chối (bắt buộc ghi lý do) / ẩn khóa, duyệt nội dung bài học cập nhật; admin cũng tạo khóa và phân công 1 hoặc nhiều giảng viên |
| Báo cáo & review | Xử lý báo cáo vi phạm, kiểm duyệt đánh giá khóa học |
| Người dùng | Tìm/lọc, xem chi tiết, tạo tài khoản, đổi vai trò, khóa tài khoản (ghi lý do), xóa tài khoản |
| Quản lý học viên | Tiến độ học viên, duyệt đề nghị kỷ luật từ giảng viên |
| Danh mục & tag | Thêm / sửa / xóa danh mục và tag |
| Chứng chỉ | Tra cứu, thu hồi (ghi lý do), khôi phục chứng chỉ |
| Giao dịch | Danh sách thanh toán |
| Mã giảm giá | Tạo / vô hiệu hóa mã giảm giá toàn hệ thống |
| Gửi thông báo | Gửi thông báo hàng loạt tới người dùng |

### Super Admin (`/super-admin`)

Có toàn bộ chức năng của Admin, thêm:

- **Dashboard hệ thống:** số lượng admin/người dùng, doanh thu, biểu đồ doanh thu 6 tháng, trạng thái khóa học,
  cơ cấu vai trò, khóa học nhiều học viên nhất.
- **Quản lý Admin:** cấp / thu hồi quyền admin.
- **Cấu hình hệ thống:** phí nền tảng, ngưỡng % xem video để hoàn thành bài, điểm đạt mặc định, đơn vị tiền tệ…
  (mọi thay đổi được ghi nhật ký kèm giá trị trước/sau).
- **Nhật ký hoạt động:** mọi thao tác quản trị (chỉ đọc).

> Client không thể tự đổi `role`/`is_banned` (trigger `trg_profiles_guard_privilege`) —
> chỉ qua `fn_set_role` / `fn_toggle_ban` hoặc SQL Editor.

### Luồng xuất bản khóa học

1. Admin hoặc giảng viên tạo khóa (trạng thái **Nháp**) và phân công giảng viên.
2. Giảng viên soạn nội dung rồi **Gửi duyệt** → **Chờ duyệt**. Khóa chỉ gửi duyệt / xuất bản được khi đủ:
   - ít nhất **3 chương** và **5 bài giảng có video**;
   - **mỗi bài video có 1 quiz**;
   - có **bài thi cuối khóa** với ít nhất 1 câu hỏi.
3. Admin duyệt → **Đang bán** (video trong khóa được duyệt theo), hoặc từ chối kèm lý do gửi về giảng viên.
4. Học viên mua khóa → học tuần tự → thi cuối khóa → nhận chứng chỉ.

## Chạy local

### 1. Cài đặt

```bash
# Node >= 20 (khuyến nghị 20.13.1; có nvm thì: nvm use)
corepack enable          # bật pnpm đi kèm Node
pnpm install             # cài deps + git hook naming-guard
```

### 2. Biến môi trường

Tạo `.env.local` (đã có trong `.gitignore`, **không commit**). Với Supabase local dùng các key demo mặc định của Supabase CLI:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY in ra khi chạy `npx supabase start` / `npx supabase status`>
# Chỉ dùng phía server (tạo/xóa tài khoản ở trang admin). KHÔNG đặt tiền tố NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY in ra cùng chỗ>
```

Dùng Supabase Cloud thì lấy URL + key ở **Project Settings › API**.

### 3. Database

**a) Supabase local (cần Docker Desktop).** Supabase CLI lấy phần số đầu tên file làm phiên bản migration, mà repo có
các migration trùng số (`0020`, `0025`–`0028`) nên `npx supabase start` / `db reset` chạy thẳng trong repo sẽ lỗi.
Chạy từ một bản sao đã đánh số lại (giữ nguyên thứ tự), ví dụ bằng Git Bash:

```bash
rm -rf ../lms-supabase && mkdir -p ../lms-supabase/supabase/migrations
cp supabase/config.toml supabase/seed.sql ../lms-supabase/supabase/
i=0; for f in $(ls supabase/migrations | LC_ALL=C sort); do
  i=$((i+1)); cp "supabase/migrations/$f" "../lms-supabase/supabase/migrations/$(printf '20260101%06d' $i)_$f"
done
(cd ../lms-supabase && npx supabase@latest start)   # lần đầu: tự chạy toàn bộ migration + seed.sql
```

- **Có migration mới** (sau khi pull code): chạy lại vòng lặp copy ở trên rồi
  `(cd ../lms-supabase && npx supabase@latest migration up)` — chỉ chạy các migration chưa áp dụng, **giữ nguyên dữ liệu**.
- **Muốn làm lại DB từ đầu:** `(cd ../lms-supabase && npx supabase@latest db reset)` — **xóa sạch dữ liệu**, chạy lại migration + seed.
- Dữ liệu nằm trong Docker volume `supabase_db_lms` nên **vẫn còn** sau khi tắt máy / `supabase stop`;
  chỉ mất khi `db reset`, `supabase stop --no-backup` hoặc xóa volume. Supabase Studio: `http://127.0.0.1:54323`.

**b) Supabase Cloud.** Mở SQL Editor, chạy lần lượt từng file trong `supabase/migrations/` theo **thứ tự tên file**
(mỗi file một lần chạy; `0009` phải chạy riêng trước `0010`), rồi chạy `supabase/seed.sql`.

Sinh kiểu TypeScript từ schema (tùy chọn): `pnpm db:types`.

### 4. Chạy app

```bash
pnpm dev          # cổng người dùng  → http://localhost:3000
pnpm dev:admin    # cổng quản trị    → http://localhost:3001
```

Hai cổng build ra thư mục riêng (`.next` và `.next-admin`) nên chạy song song được.

### Tài khoản mẫu (`seed.sql`)

Mật khẩu chung: `Password123!`

| Vai trò | Email | Cổng |
|---|---|---|
| Học viên | `hva@demo.local`, `hvb@demo.local` | 3000 |
| Giảng viên | `gv@demo.local` | 3000 |
| Admin | `admin@demo.local` | 3001 |
| Super Admin | `superadmin@demo.local` | 3001 |

Tạo super admin cho DB không có seed: đăng ký 1 tài khoản rồi chạy trong SQL Editor (quyền postgres)
`update profiles set role = 'super_admin' where id = '<uuid user>';`. Các admin sau đó cấp ở **/super-admin/admins**.

## Video bài học

- Giảng viên dán link **YouTube** (`youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/embed/…`) hoặc **link file video trực tiếp** (MP4/WebM).
- Video YouTube phải để Công khai hoặc Không công khai và **cho phép nhúng**.
- Cả hai loại đều ghi nhận % đã xem, hoàn thành bài và mở khóa bài tiếp theo.
- Lưu ý: học viên có thể mở video YouTube trực tiếp trên youtube.com; nội dung cần bảo vệ nên dùng file video.

## Database & migration

Schema, hàm, view, trigger và RLS nằm trong `supabase/migrations/` — **chạy đúng thứ tự tên file**.

| Nhóm | Nội dung |
|---|---|
| `0001`–`0003` | Enum, hàm quyền, bảng nội dung (khóa/chương/bài), thương mại (giỏ, thanh toán, ghi danh) và học tập |
| `0004`–`0008` | View/hàm nội dung, tiến độ – chấm điểm – chứng chỉ, mua mô phỏng, bảo vệ nội dung trả phí |
| `0009`–`0014` | Vai trò `super_admin` (**`0009` chạy riêng trước `0010`**), phân quyền, nhật ký cấu hình, lý do từ chối/khóa, báo cáo, review/Q&A/chứng chỉ |
| `0015`–`0019` | Duyệt video, duyệt ghi danh khóa miễn phí, nhận xét học viên |
| `0020`–`0024` | Mở khóa bài tuần tự, quy trình thi cuối khóa, kỷ luật học viên, tên khóa không trùng |
| `0025`–`0029` | Tự cấp chứng chỉ, số điện thoại hồ sơ, nhiều giảng viên/khóa, gộp kiểm duyệt khóa, ràng buộc xuất bản, thi cuối có giờ & chấm tự luận, đăng đề |
| `0030`–`0034` | Sửa RLS tạo quiz, giảng viên đồng phụ trách được soạn khóa, sửa mở khóa bài, sửa bắt đầu thi cuối, sửa cấp chứng chỉ |

Không sửa migration đã merge — cần đổi schema thì tạo migration **mới** (số tiếp theo, không trùng).

## Kiểm tra chất lượng

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm check:names   # naming-guard
```

Các lệnh này chạy tự động trên mọi PR (`.github/workflows/ci.yml`). Giữ `main` luôn xanh.

`scripts/naming-guard.mjs` chặn: bảng/enum/hàm/view đặt sai tên (không có trong `DATA_DICTIONARY.md`), sai tiền tố
(`fn_`/`view_`/`trg_`/`idx_`), `drop table`/`truncate`, commit `.env.local`, sửa migration đã đóng băng. Hook chạy ở
git pre-commit (tự bật sau `pnpm install`), CI và Claude Code (`.claude/settings.json`).
Cần tên mới → thêm vào `DATA_DICTIONARY.md` + danh sách trong `scripts/naming-guard.mjs`.

## Hạn chế đã biết

- **Tải video lên Supabase Storage chưa hoàn thiện:** repo chưa có migration tạo bucket `lesson-videos`, và học viên chưa
  được cấp link xem có thời hạn (signed URL) cho video tải lên. Hiện dùng link YouTube / link file video.
- **Thanh toán là mô phỏng**, không kết nối cổng thanh toán thật; khóa học đã mua không hoàn tiền.
