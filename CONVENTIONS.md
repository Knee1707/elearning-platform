# CONVENTIONS.md — Quy ước bắt buộc

> Leader chốt. Mọi PR phải theo. Muốn đổi → mở issue, Leader duyệt.

## 1. Nhánh & commit (Git)

```
Branch:  <type>/<scope>-<mô-tả>     feat/course-crud, data/quiz-grading, fix/progress-percent
Commit:  Conventional Commits       feat(course): add publish workflow
                                     fix(progress): correct percent calc
PR:      1 PR = 1 issue (1 lá cây MECE), nhỏ, Leader review trong ngày.
```

- Không push thẳng `main`. Mọi thay đổi qua PR + 1 review.
- Không `--no-verify`. Không tự thêm/nâng dependency (mở issue cho Leader).

> **TÊN CỤ THỂ (bảng/cột/enum/hàm/view):** tra `DATA_DICTIONARY.md` — nguồn tên DUY NHẤT.
> CẤM tự đặt tên ngoài sổ đó; cần thêm → mở issue cho Leader thêm vào sổ trước.

## 2. Database (Postgres / Supabase) — `snake_case`

```
Bảng:      snake_case, số nhiều       courses, lesson_progress, exam_attempts
Cột:       snake_case                 id, created_at, is_published, course_id
Khóa chính id  uuid  default gen_random_uuid()
Khóa ngoại <đơn>_id                   course_id, user_id, chapter_id
Thời gian  created_at / updated_at    (timestamptz)
Boolean    is_ / has_                 is_free, has_certificate, is_banned
Enum type  <danh_từ>_<thuộc_tính>     course_status, attendance_source
View       view_<tên>                 view_course_catalog
Function   fn_<động_từ>_<danh_từ>      fn_mark_complete, fn_submit_attempt
Trigger    trg_<bảng>_<sự_kiện>        trg_attendance_on_video
Policy     <bảng>_<hành_động>_<vai>   courses_select_visible
Index      idx_<bảng>_<cột>           idx_lessons_chapter_id
```

- **RLS bật cho MỌI bảng.** Hàm dùng trong RLS đặt `security definer` + `set search_path = public` để không đệ quy.
- Cột nullable trong UNIQUE index thường: dùng `coalesce(...)` (xem `attendance`) hoặc `nulls not distinct`. **Seed idempotent dùng `where not exists`, không dựa `on conflict` khi có cột nullable.**
- Migration đặt tên `NNNN_mô_tả.sql`, số tăng dần, KHÔNG sửa file đã merge.

## 3. TypeScript / React

```
Biến & hàm        camelCase           courseId, fetchCourse()
Component & Type   PascalCase          CourseCard, LessonProgress
Hằng số            UPPER_SNAKE_CASE    MAX_UPLOAD_SIZE
Boolean            is / has / should   isEnrolled, hasAccess
Event handler      handle<Event>       handleSubmit, handleDragEnd
Hook               use<Tên>            useCourse, useProgress
```

- **DB `snake_case` ⇄ TS `camelCase`** map ở tầng `lib/queries`. UI luôn nhận `camelCase`.
- App **KHÔNG viết SQL** — chỉ gọi hàm trong `lib/queries/`.
- `strict: true`. Không dùng `any` trừ khi có `// eslint-disable` + lý do.

## 4. Tên file

```
Component   PascalCase.tsx      CourseCard.tsx, VideoPlayer.tsx
Hook/util   camelCase.ts        useCourse.ts, formatPrice.ts
Route       chữ thường (Next)   page.tsx, layout.tsx, loading.tsx
Migration   NNNN_mô_tả.sql      0001_init.sql
```

## 5. Ranh giới file (chống đụng)

| Người | Sở hữu |
|---|---|
| **L** | migrations 0001–0003, 0006 · `lib/supabase` · `lib/queries/{commerce,admin,auth}.ts` · `lib/utils` · `types` · `components/ui` · `app/layout.tsx` · config gốc |
| **M1** | `0004_content_logic.sql` · `lib/queries/courses.ts` · phần nội dung `seed.sql` |
| **M2** | `0005_learning_logic.sql` · `lib/queries/{progress,quiz,attendance,qa}.ts` · phần học tập `seed.sql` |
| **M3** | `app/(student)/` · `features/{lesson,cart,live/join,quiz/take,certificate}` · `components/shared` · `globals.css` · `styles` |
| **M4** | `app/(auth)/` · `app/(instructor)/` · `app/(admin)/` · `features/{course,live/manage,quiz/author}` |

Sửa file người khác → mở PR, người đó review.
