# DATA_DICTIONARY.md — Sổ đăng ký TÊN (chống đặt sai / đụng tên)

> **Đây là NGUỒN TÊN DUY NHẤT.** Mọi bảng/cột/enum/hàm/view/trigger/policy phải dùng đúng tên ở đây.
> Nguồn gốc: các file `supabase/migrations/*.sql`. Nếu lệch, **migration là đúng**, sửa file này theo.

## 0. Nguyên tắc vàng (đọc trước)

1. **CẤM tự đặt tên mới** cho bảng/cột/hàm/view nằm ngoài sổ này.
2. Cần thêm bảng/cột/hàm/view → **mở issue cho Leader**, thêm vào sổ này **TRƯỚC**, rồi mới code.
3. Quy tắc gõ: bảng/cột `snake_case`; hàm `fn_`, view `view_`, trigger `trg_`, index `idx_`, policy `<bảng>_<hành_động>_<vai>`. Tham số hàm dùng tiền tố `p_` (trừ vài helper RLS cũ: `cid/ch/le/pid/qid`).
4. Hàm/view có chữ **[M1]** hoặc **[M2]** = tên đã **đặt trước (reserved)**. M1/M2 phải tạo **đúng tên + đúng tham số** này, không đổi.

---

## 1. ENUM (11) — dùng đúng tên type + đúng giá trị

| Enum | Giá trị hợp lệ |
|---|---|
| `user_role` | `student` · `instructor` · `admin` · `super_admin` **[0009]** |
| `course_status` | `draft` · `pending` · `published` · `rejected` · `hidden` |
| `enrollment_status` | `active` · `refunded` |
| `payment_status` | `pending` · `paid` · `refunded` |
| `attendance_source` | `video` · `live` |
| `coupon_type` | `percent` · `fixed` |
| `review_status` | `visible` · `hidden` · `pending` |
| `refund_status` | `pending` · `approved` · `rejected` |
| `report_status` | `open` · `resolved` · `dismissed` |
| `payout_status` | `draft` · `paid` |
| `notif_type` | `purchase` · `reply` · `system` · `reminder` |

---

## 2. BẢNG + CỘT (33 bảng) — tên cột phải KHỚP 100%

> Cột chung mọi bảng có PK: `id uuid` (trừ `system_setting` PK là `key`, `course_tag` PK ghép).
> **FK→** = khóa ngoại tới bảng nào.

### Cụm L — Danh tính · Thương mại (0001 + 0003)

| Bảng | Cột (đúng thứ tự, đúng tên) |
|---|---|
| `profiles` | `id`(PK,FK→auth.users) · `full_name` · `avatar_url` · `role`(user_role) · `is_banned` · `created_at` |
| `system_setting` | `key`(PK) · `value`(jsonb) · `updated_at` |
| `activity_log` | `id` · `user_id`(FK→profiles) · `action` · `entity` · `entity_id` · `created_at` · `reason` **[0010]** · `metadata`(jsonb) **[0010]** |
| `coupon` | `id` · `code`(UNIQUE) · `type`(coupon_type) · `value` · `instructor_id`(FK→profiles) · `valid_from` · `valid_to` · `usage_limit` · `used_count` · `created_at` |
| `enrollments` | `id` · `user_id`(FK→profiles) · `course_id`(FK→courses) · `status`(enrollment_status) · `purchased_at` |
| `cart_item` | `id` · `user_id`(FK→profiles) · `course_id`(FK→courses) · `added_at` |
| `wishlist` | `id` · `user_id`(FK→profiles) · `course_id`(FK→courses) |
| `payments` | `id` · `user_id`(FK→profiles) · `course_id`(FK→courses) · `coupon_id`(FK→coupon) · `amount` · `method` · `status`(payment_status) · `created_at` |
| `refund` | `id` · `payment_id`(FK→payments) · `reason` · `status`(refund_status) · `created_at` · `resolved_at` |
| `payout` | `id` · `instructor_id`(FK→profiles) · `period` · `gross` · `platform_fee` · `net` · `status`(payout_status) |

### Cụm M1 — Nội dung (0002)

| Bảng | Cột |
|---|---|
| `categories` | `id` · `name` · `slug`(UNIQUE) |
| `tag` | `id` · `name` · `slug`(UNIQUE) |
| `course_tag` | `course_id`(FK→courses) · `tag_id`(FK→tag) — PK ghép (course_id, tag_id) |
| `courses` | `id` · `instructor_id`(FK→profiles) · `category_id`(FK→categories) · `title` · `slug`(UNIQUE) · `description` · `level` · `price` · `status`(course_status) · `thumbnail_url` · `is_featured` · `created_at` · `updated_at` · `moderation_note` **[0014]** (lý do từ chối/ẩn gần nhất) |
| `chapters` | `id` · `course_id`(FK→courses) · `title` · `position` |
| `lessons` | `id` · `chapter_id`(FK→chapters) · `title` · `video_url` · `video_status` · `duration_seconds` · `is_free` · `position` |
| `attachments` | `id` · `lesson_id`(FK→lessons) · `name` · `file_url` · `type` |
| `reviews` | `id` · `course_id`(FK→courses) · `user_id`(FK→profiles) · `rating` · `comment` · `status`(review_status, mặc định `pending` từ **0014**) · `created_at` |

### Cụm M2 — Học tập · Đánh giá · Điểm danh (0003)

| Bảng | Cột |
|---|---|
| `lesson_progress` | `id` · `user_id`(FK→profiles) · `lesson_id`(FK→lessons) · `watched_percent` · `is_completed` · `last_position_seconds` · `updated_at` |
| `lesson_note` | `id` · `user_id`(FK→profiles) · `lesson_id`(FK→lessons) · `timestamp_seconds` · `content` · `created_at` |
| `qa_question` | `id` · `lesson_id`(FK→lessons) · `user_id`(FK→profiles) · `content` · `created_at` |
| `qa_answer` | `id` · `question_id`(FK→qa_question) · `user_id`(FK→profiles) · `content` · `created_at` |
| `quizzes` | `id` · `lesson_id`(FK→lessons) · `title` · `pass_score` |
| `questions` | `id` · `quiz_id`(FK→quizzes) · `content` · `position` |
| `options` | `id` · `question_id`(FK→questions) · `content` · `is_correct` |
| `exams` | `id` · `course_id`(FK→courses) · `title` · `time_limit_minutes` · `pass_score` |
| `exam_attempts` | `id` · `exam_id`(FK→exams) · `user_id`(FK→profiles) · `score` · `started_at` · `submitted_at` |
| `answers` | `id` · `attempt_id`(FK→exam_attempts) · `question_id`(FK→questions) · `option_id`(FK→options) |
| `certificates` | `id` · `user_id`(FK→profiles) · `course_id`(FK→courses) · `code`(UNIQUE) · `issued_at` · `revoked_at` **[0014]** · `revoked_reason` **[0014]** |
| `live_sessions` | `id` · `course_id`(FK→courses) · `title` · `meet_url` · `scheduled_at` · `created_by`(FK→profiles) |
| `attendance` | `id` · `user_id`(FK→profiles) · `course_id`(FK→courses) · `source`(attendance_source) · `lesson_id`(FK→lessons) · `live_session_id`(FK→live_sessions) · `attended_at` |
| `notification` | `id` · `user_id`(FK→profiles) · `type`(notif_type) · `title` · `body` · `is_read` · `created_at` |
| `report` | `id` · `reporter_id`(FK→profiles) · `entity` · `entity_id` · `reason` · `status`(report_status) · `created_at` |

---

## 3. RÀNG BUỘC — tên đã đặt + quy tắc đặt tên mới

### UNIQUE (chống trùng) — dùng đúng bộ cột này
| Bảng | Cột UNIQUE |
|---|---|
| `enrollments` | (`user_id`, `course_id`) |
| `cart_item` | (`user_id`, `course_id`) |
| `wishlist` | (`user_id`, `course_id`) |
| `payout` | (`instructor_id`, `period`) |
| `reviews` | (`course_id`, `user_id`) |
| `lesson_progress` | (`user_id`, `lesson_id`) |
| `answers` | (`attempt_id`, `question_id`) |
| `certificates` | (`user_id`, `course_id`) · `code` |
| `coupon` | `code` |
| `courses` | `slug` |
| `categories` / `tag` | `slug` |
| `attendance` | index `uq_attendance_once` = (`user_id`, `source`, `coalesce(lesson_id, live_session_id)`) |

### CHECK đã đặt tên (dùng lại đúng tên nếu sửa)
| Tên | Bảng | Nội dung |
|---|---|---|
| `coupon_percent_max` | `coupon` | mã percent ≤ 100 |
| `attendance_source_shape` | `attendance` | video→`lesson_id`, live→`live_session_id` (đúng 1 nguồn) |

> CHECK khác (không đặt tên riêng, để Postgres tự đặt): `value>0`, `price>=0`, `rating between 1 and 5`, `watched_percent between 0 and 100`, `pass_score between 0 and 100`, `duration_seconds>=0`, `amount>=0`, `time_limit_minutes>0`, `last_position_seconds>=0`, `timestamp_seconds>=0`.

### Quy tắc đặt tên ràng buộc/index MỚI (khi thêm)
```
UNIQUE (đặt tên):  uq_<bảng>_<cột>         uq_attendance_once
CHECK  (đặt tên):  <bảng>_<luật>          coupon_percent_max
Index:             idx_<bảng>_<cột>       idx_lessons_chapter_id
Policy:            <bảng>_<hành_động>_<vai>  courses_select_visible
```

### Index đã tạo (đừng tạo trùng)
`idx_activity_log_user_id`, `idx_activity_log_created_at`, `idx_coupon_code`,
`idx_courses_instructor_id`, `idx_courses_category_id`, `idx_courses_status`,
`idx_course_tag_tag_id`, `idx_chapters_course_id`, `idx_lessons_chapter_id`,
`idx_attachments_lesson_id`, `idx_reviews_course_id`, `idx_enrollments_user_id`,
`idx_enrollments_course_id`, `idx_cart_item_user_id`, `idx_wishlist_user_id`,
`idx_payments_user_id`, `idx_payments_course_id`, `idx_payments_created_at`,
`idx_refund_payment_id`, `idx_payout_instructor_id`, `idx_lesson_progress_user_id`,
`idx_lesson_note_user_lesson`, `idx_qa_question_lesson_id`, `idx_qa_answer_question_id`,
`idx_quizzes_lesson_id`, `idx_questions_quiz_id`, `idx_options_question_id`,
`idx_exams_course_id`, `idx_exam_attempts_user_id`, `idx_exam_attempts_exam_id`,
`idx_answers_attempt_id`, `idx_certificates_user_id`, `idx_live_sessions_course_id`,
`idx_attendance_course_id`, `idx_attendance_user_id`, `uq_attendance_once`,
`idx_notification_user_unread`, `idx_report_status`, `idx_activity_log_entity` **[0010]**.

---

## 4. HÀM / VIEW / TRIGGER của L (ĐÃ CÓ — đừng tạo lại)

**Helper RLS (0001/0002/0003):** `fn_current_role()`, `fn_is_admin()`, `fn_owns_course(cid)`, `fn_course_visible(cid)`, `fn_chapter_course(ch)`, `fn_lesson_course(le)`, `fn_is_enrolled(cid)`, `fn_owns_payment(pid)`, `fn_quiz_course(qid)`, `fn_question_course(qid)`, `fn_touch_updated_at()`.

**Nghiệp vụ (0006):**
| Hàm | Tham số |
|---|---|
| `fn_get_setting` | `p_key text` |
| `fn_add_to_cart` | `p_course uuid` |
| `fn_remove_from_cart` | `p_course uuid` |
| `fn_toggle_wishlist` | `p_course uuid` → bool |
| `fn_mock_purchase` | `p_course_ids uuid[]`, `p_coupon_code text` |
| `fn_request_refund` | `p_payment uuid`, `p_reason text` |
| `fn_approve_refund` | `p_refund uuid` |
| `fn_generate_payout` | `p_period text` |
| `fn_set_role` | `p_user uuid`, `p_role user_role` |
| `fn_toggle_ban` | `p_user uuid`, `p_reason text` **[0012]** (bắt buộc khi khóa) → bool |
| `fn_moderate_course` | `p_course uuid`, `p_status course_status`, `p_reason text` **[0012]** (bắt buộc khi `rejected`/`hidden`; gửi thông báo cho giảng viên) |
| `fn_moderate_review` | `p_review uuid`, `p_status review_status` |
| `fn_resolve_report` | `p_report uuid`, `p_status report_status` |
| `fn_get_lesson_video` **[HOTFIX 0007]** | `p_lesson uuid` → `text` (URL video nếu is_free / đã ghi danh / chủ / admin, ngược lại `null`) |
| `fn_get_attachment` **[HOTFIX 0007]** | `p_attachment uuid` → `text` (URL tài liệu, điều kiện như trên) |
| `fn_get_live_meet` **[HOTFIX 0007]** | `p_live uuid` → `text` (meet_url cho chủ/admin quản lý; HV vào qua `fn_join_live_session`) |

**Phân quyền Super Admin + nhật ký (0009/0010):**
| Hàm | Tham số / ghi chú |
|---|---|
| `fn_is_super_admin` | () → bool. Role `super_admin` và không bị khóa |
| `fn_is_admin` **[sửa 0010]** | () → bool. Role `admin` **hoặc** `super_admin`, và không bị khóa |
| `fn_log_activity` | `p_action text`, `p_entity text`, `p_entity_id uuid`, `p_reason text`, `p_metadata jsonb`. Chỉ gọi từ hàm security definer (đã thu hồi EXECUTE của client) |
| `fn_guard_profile_privilege` | trigger function cho `trg_profiles_guard_privilege`: chặn client tự đổi `role`/`is_banned` |
| `fn_reject_refund` **[0012]** | `p_refund uuid`, `p_reason text`. Chỉ super admin; gửi thông báo cho học viên |
| `fn_mark_payout_paid` **[0012]** | `p_payout uuid`. Chỉ super admin; `draft → paid`, gửi thông báo cho giảng viên |
| `fn_broadcast_notification` **[0012]** | `p_title text`, `p_body text`, `p_role user_role`, `p_course uuid` → `integer` (số người nhận). Admin gửi thông báo `system` |
| `fn_block_banned_user` **[0013]** | trigger function cho `trg_<bảng>_block_banned`: tài khoản bị khóa không ghi được dữ liệu (kể cả qua hàm definer) |
| `fn_sync_auth_ban` **[0013]** | trigger function cho `trg_profiles_sync_auth_ban`: đồng bộ `profiles.is_banned` → `auth.users.banned_until` (chặn đăng nhập) |
| `fn_submit_report` **[0013]** | `p_entity text`, `p_entity_id uuid`, `p_reason text` → `uuid`. Gửi báo cáo vi phạm (course/review/user), chống trùng |
| `fn_request_refund` **[sửa 0013]** | thêm kiểm tra: lý do bắt buộc, giao dịch `paid`, chưa có yêu cầu đang chờ/đã duyệt, trong hạn `refund_window_days` |
| `fn_guard_review_status` **[0014]** | trigger function cho `trg_reviews_guard_status`: học viên tạo/sửa review → `pending`; không tự đổi `status` |
| `fn_moderate_qa` **[0014]** | `p_entity text` ('question'|'answer'), `p_id uuid`, `p_reason text`. Admin xóa câu hỏi/trả lời vi phạm, báo người viết |
| `fn_revoke_certificate` **[0014]** | `p_certificate uuid`, `p_reason text`, `p_revoke boolean` (mặc định true; false = khôi phục). Admin thu hồi/khôi phục chứng chỉ |
| `fn_verify_certificate` **[sửa 0014]** | trả thêm cột `revoked_at` |
| `fn_log_setting_change` **[0011]** | trigger function cho `trg_system_setting_audit`: ghi `activity_log` khi `system_setting` đổi |
| `fn_review_lesson_video` **[0015]** | `p_lesson uuid`, `p_approve boolean`, `p_reason text` (bắt buộc khi từ chối). Admin duyệt/từ chối video bài giảng, báo giảng viên, ghi log |
| `fn_lesson_video_review_guard` **[0015]** | trigger function cho `trg_lesson_video_review`: `video_url` đổi → `lessons.video_review = 'pending'` (hoặc `'none'` nếu gỡ video) |
| `fn_get_lesson_video` **[sửa 0015]** | thêm điều kiện: học viên chỉ nhận URL khi `video_review = 'approved'` (chủ khóa/admin xem mọi trạng thái) |
| `fn_request_enroll` **[0017]** | `p_course uuid`. Học viên xin vào lớp khóa MIỄN PHÍ (đã publish) → enrollment `pending`; khóa trả phí báo lỗi |
| `fn_review_enroll` **[0017]** | `p_enrollment uuid`, `p_approve boolean`. Chủ khóa/admin duyệt (`pending→active`) hoặc từ chối (xóa), báo học viên |

**Enum [0017]:** `enrollment_status` thêm `pending` (chờ GV duyệt vào lớp). **RLS [0017]:** GV phụ trách xem được `enrollments` / `lesson_progress` / `attendance` / `exam_attempts` của khóa mình (policy `*_select_instructor`).

| `fn_send_feedback` **[0018]** | `p_course uuid`, `p_student uuid`, `p_content text`. GV (chủ khóa) gửi nhận xét quá trình học cho học viên đang học; báo học viên |

**Bảng [0018]:** `student_feedback` (id, course_id, student_id, instructor_id, content, created_at) — GV nhận xét học viên; RLS `student_feedback_select` (học viên nhận / GV gửi / admin).

| `fn_request_certificate` **[0019]** | `p_course uuid`. Học viên xin cấp chứng chỉ khi đã ĐẠT bài thi → `certificates.status='pending'` |
| `fn_review_certificate` **[0019]** | `p_certificate uuid`, `p_approve boolean`. Admin duyệt (`pending→approved`, cấp) hoặc từ chối (xóa), báo học viên |
| `fn_verify_certificate` **[sửa 0019]** | chỉ tra cứu công khai chứng chỉ `status='approved'` |

**Cột [0019]:** `certificates.status` (text, mặc định `'approved'`: `pending`/`approved`). **Bỏ trigger** `trg_issue_certificate` (không tự cấp nữa — chuyển sang xin/duyệt).

**Cột thêm [0015]:** `lessons.video_review` (text, mặc định `'none'`: `none`/`pending`/`approved`/`rejected`), `lessons.video_review_reason` (text).

**View:** `view_admin_dashboard`, `view_instructor_payout`.
**Trigger:** `trg_profile_on_signup` (auth.users), `trg_courses_touch` (courses), `trg_profiles_guard_privilege` (profiles) **[0010]**, `trg_system_setting_audit` (system_setting) **[0011]**, `trg_profiles_sync_auth_ban` (profiles) **[0013]**, `trg_reviews_guard_status` (reviews) **[0014]**, `trg_lesson_video_review` (lessons) **[0015]**, `trg_<bảng>_block_banned` **[0013]** trên: `payments`, `enrollments`, `cart_item`, `wishlist`, `reviews`, `qa_question`, `qa_answer`, `lesson_note`, `lesson_progress`, `exam_attempts`, `report`, `refund`, `courses`, `live_sessions`, `coupon`.

---

## 5. HÀM / VIEW DÀNH RIÊNG cho M1 — TẠO ĐÚNG TÊN (0004_content_logic.sql)

| Loại | Tên (reserved) | Tham số / cột |
|---|---|---|
| view | `view_course_catalog` | khóa `published` + `avg_rating` + `is_featured`, sort mới nhất |
| fn | `fn_search_courses` | `p_keyword text`, `p_category uuid`, `p_level text`, `p_max_price numeric`, `p_min_rating numeric` |
| view | `view_course_detail` | khóa + GV + chương→bài |
| view | `view_course_rating` | `course_id`, `avg_rating`, `rating_count` |
| view | `view_instructor_stats` | `instructor_id`, `student_count`, `revenue`, `completion_rate` |
| fn | `fn_apply_coupon` | `p_code text`, `p_course_ids uuid[]` → `numeric` (giá sau giảm) |

---

## 6. HÀM / VIEW / TRIGGER DÀNH RIÊNG cho M2 — TẠO ĐÚNG TÊN (0005_learning_logic.sql)

| Loại | Tên (reserved) | Tham số |
|---|---|---|
| fn | `fn_update_watch` | `p_lesson uuid`, `p_percent int` |
| fn | `fn_save_position` | `p_lesson uuid`, `p_seconds int` |
| fn | `fn_mark_complete` | `p_lesson uuid` |
| view | `view_course_progress` | `user_id`, `course_id`, `percent` |
| fn | `fn_get_quiz` | `p_quiz uuid` → câu hỏi + đáp án **KHÔNG kèm `is_correct`** |
| fn | `fn_submit_attempt` | `p_exam uuid`, `p_answers jsonb` → `int` (điểm) |
| fn | `fn_issue_certificate` | trigger function cho `trg_issue_certificate` |
| trg | `trg_issue_certificate` | cấp khi đạt |
| fn | `fn_verify_certificate` | `p_code text` |
| view | `view_certificate` | danh sách chứng chỉ đã cấp |
| fn | `fn_attendance_on_video` | trigger function cho `trg_attendance_on_video` |
| trg | `trg_attendance_on_video` | `% ≥ ngưỡng` → attendance(video) |
| fn | `fn_join_live_session` | `p_live uuid` → `text` (meet_url) |
| view | `view_attendance` | báo cáo điểm danh |
| fn | `fn_add_note` | `p_lesson uuid`, `p_seconds int`, `p_content text` |
| fn | `fn_ask_question` | `p_lesson uuid`, `p_content text` |
| fn | `fn_answer_question` | `p_question uuid`, `p_content text` |
| trg | `trg_notify_on_answer` | sinh thông báo khi có câu trả lời mới |
| fn | `fn_notify_on_answer` | trigger function cho `trg_notify_on_answer` |
| fn | `fn_mark_read` | `p_notification uuid` |

---

## 7. TÊN HÀM TS trong `lib/queries` (App↔Data) — M3/M4 gọi đúng

| File (chủ) | Hàm TS (camelCase) |
|---|---|
| `auth.ts` (L) | `getCurrentUser`, `getMyProfile`, `requireRole` |
| `commerce.ts` (L) | `addToCart`, `removeFromCart`, `toggleWishlist`, `mockPurchase`, `requestRefund`, `isEnrolled` |
| `admin.ts` (L) | `getAdminDashboard`, `moderateCourse`, `moderateReview`, `resolveReport`, `setRole`, `toggleBan`, `approveRefund`, `generatePayout`, `rejectRefund`, `markPayoutPaid`, `broadcastNotification`, `moderateQa`, `revokeCertificate` |
| `courses.ts` (M1) | `getCourseCatalog`, `searchCourses`, `getCourseDetail`, `applyCoupon` |
| `progress.ts` (M2) | `updateWatch`, `savePosition`, `markComplete`, `getCourseProgress` |
| `quiz.ts` (M2) | `getQuiz`, `submitAttempt`, `verifyCertificate` |
| `attendance.ts` (M2) | `joinLiveSession`, `getMyAttendance`, `getClassAttendance` |
| `qa.ts` (M2) | `addNote`, `askQuestion`, `answerQuestion`, `markRead` |

> Quy tắc map: DB `snake_case` ⇄ TS `camelCase`, làm ở `lib/queries`. UI luôn nhận `camelCase`.

---

## 8. Khi cần THÊM tên mới (bắt buộc)

1. Mở issue mô tả bảng/cột/hàm cần thêm + lý do.
2. Leader thêm dòng vào sổ này + (nếu là bảng/cột) viết migration mới `NNNN_*.sql`.
3. Mới đó thành viên mới được dùng tên đó trong code.
4. **CẤM** vừa code vừa tự đặt tên chưa có trong sổ.
