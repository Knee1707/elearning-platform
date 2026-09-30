#!/usr/bin/env node
/**
 * naming-guard.mjs — CHẶN đặt tên sai + lệnh hủy dự án.
 * Nguồn tên: DATA_DICTIONARY.md (đồng bộ tay khi sổ đổi).
 *
 * Cách chạy:
 *   node scripts/naming-guard.mjs --staged   # git pre-commit (file đang stage)
 *   node scripts/naming-guard.mjs --all       # CI (mọi migration)
 *   node scripts/naming-guard.mjs --claude     # Claude Code PreToolUse (đọc JSON stdin)
 *   node scripts/naming-guard.mjs <file.sql>   # kiểm 1 file
 *
 * Exit: 0 = sạch · 1 = có lỗi (git/CI) · 2 = có lỗi (Claude Code chặn tool).
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

// ------------------------------------------------------------------ //
// DANH SÁCH TÊN HỢP LỆ (khớp DATA_DICTIONARY.md — sửa cả 2 khi thêm)
// ------------------------------------------------------------------ //
const ALLOWED = {
  tables: new Set([
    "profiles", "system_setting", "activity_log", "coupon", "enrollments",
    "cart_item", "wishlist", "payments", "refund", "payout", "categories",
    "tag", "course_tag", "courses", "chapters", "lessons", "attachments",
    "reviews", "lesson_progress", "lesson_note", "qa_question", "qa_answer",
    "quizzes", "questions", "options", "exams", "exam_attempts", "answers",
    "certificates", "live_sessions", "attendance", "notification", "report",
  ]),
  enums: new Set([
    "user_role", "course_status", "enrollment_status", "payment_status",
    "attendance_source", "coupon_type", "review_status", "refund_status",
    "report_status", "payout_status", "notif_type",
  ]),
  functions: new Set([
    // L (helper + spine)
    "fn_current_role", "fn_is_admin", "fn_owns_course", "fn_course_visible",
    "fn_chapter_course", "fn_lesson_course", "fn_is_enrolled", "fn_owns_payment",
    "fn_quiz_course", "fn_question_course", "fn_touch_updated_at", "fn_handle_new_user",
    "fn_get_setting", "fn_add_to_cart", "fn_remove_from_cart", "fn_toggle_wishlist",
    "fn_mock_purchase", "fn_request_refund", "fn_approve_refund", "fn_generate_payout",
    "fn_set_role", "fn_toggle_ban", "fn_moderate_course", "fn_moderate_review",
    "fn_resolve_report", "fn_get_lesson_video", "fn_get_attachment", "fn_get_live_meet",
    // L — phân quyền super admin + nhật ký (0010)
    "fn_is_super_admin", "fn_log_activity", "fn_guard_profile_privilege", "fn_log_setting_change",
    // M1
    "fn_search_courses", "fn_apply_coupon",
    // M2
    "fn_update_watch", "fn_save_position", "fn_mark_complete", "fn_get_quiz",
    "fn_submit_attempt", "fn_verify_certificate", "fn_join_live_session",
    "fn_add_note", "fn_ask_question", "fn_answer_question", "fn_mark_read",
    "fn_issue_certificate", "fn_attendance_on_video", "fn_notify_on_answer",
  ]),
  views: new Set([
    "view_admin_dashboard", "view_instructor_payout", "view_course_catalog",
    "view_course_detail", "view_course_rating", "view_instructor_stats",
    "view_course_progress", "view_attendance", "view_certificate",
  ]),
  triggers: new Set([
    "trg_profile_on_signup", "trg_courses_touch", "trg_issue_certificate", "trg_profiles_guard_privilege", "trg_system_setting_audit",
    "trg_attendance_on_video", "trg_notify_on_answer",
  ]),
};

// File L đã "đóng băng" — không sửa sau khi merge (trừ khi ALLOW_MIGRATION_EDIT=1).
const FROZEN = [
  "supabase/migrations/0001_init.sql",
  "supabase/migrations/0002_content.sql",
  "supabase/migrations/0003_commerce_learning.sql",
  "supabase/migrations/0006_spine_logic.sql",
];

const DICT = "DATA_DICTIONARY.md";

// ------------------------------------------------------------------ //
function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

function isSqlMigration(path) {
  return /supabase[/\\](migrations[/\\].*\.sql|seed\.sql)$/i.test(path.replace(/\\/g, "/"));
}

/** Kiểm 1 file SQL → { errors:[], warnings:[] } */
function checkSql(path, raw) {
  const errors = [];
  const warnings = [];
  const code = stripComments(raw);

  const scan = (re, fn) => {
    for (const m of code.matchAll(re)) fn(m);
  };

  // create table
  scan(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][\w]*)"?/gi, (m) => {
    if (!ALLOWED.tables.has(m[1]))
      errors.push(`Bảng '${m[1]}' KHÔNG có trong ${DICT}. Đừng tự đặt bảng mới — mở issue cho Leader.`);
  });
  // create type (enum)
  scan(/create\s+type\s+(?:public\.)?"?([a-z_][\w]*)"?/gi, (m) => {
    if (!ALLOWED.enums.has(m[1]))
      errors.push(`Enum '${m[1]}' không có trong ${DICT}.`);
  });
  // create function
  scan(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_][\w]*)"?/gi, (m) => {
    const n = m[1];
    if (!n.startsWith("fn_")) errors.push(`Hàm '${n}' phải bắt đầu bằng 'fn_'.`);
    else if (!ALLOWED.functions.has(n))
      errors.push(`Hàm '${n}' chưa đăng ký trong ${DICT}. Dùng đúng tên đã đặt trước, hoặc báo Leader thêm.`);
  });
  // create view
  scan(/create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?"?([a-z_][\w]*)"?/gi, (m) => {
    const n = m[1];
    if (!n.startsWith("view_")) errors.push(`View '${n}' phải bắt đầu bằng 'view_'.`);
    else if (!ALLOWED.views.has(n))
      errors.push(`View '${n}' chưa đăng ký trong ${DICT}.`);
  });
  // create trigger
  scan(/create\s+(?:constraint\s+)?trigger\s+"?([a-z_][\w]*)"?/gi, (m) => {
    const n = m[1];
    if (!n.startsWith("trg_")) errors.push(`Trigger '${n}' phải bắt đầu bằng 'trg_'.`);
    else if (!ALLOWED.triggers.has(n))
      warnings.push(`Trigger '${n}' chưa đăng ký trong ${DICT} (nên thêm vào sổ).`);
  });
  // create index
  scan(/create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?"?([a-z_][\w]*)"?/gi, (m) => {
    if (!/^(idx_|uq_)/.test(m[1]))
      errors.push(`Index '${m[1]}' phải bắt đầu bằng 'idx_' hoặc 'uq_'.`);
  });

  // LỆNH HỦY DỰ ÁN
  scan(/\b(drop\s+(?:table|type|schema|database)|truncate\s+table|truncate)\b/gi, (m) => {
    errors.push(`Lệnh nguy hiểm '${m[1].trim()}' có thể HỦY dữ liệu/dự án. Không dùng trong migration thường.`);
  });
  // 'cascade' chỉ đáng cảnh báo khi đi sau DROP (không phải 'on delete cascade' bình thường).
  scan(/\bdrop\b[^;]*\bcascade\b/gi, () => {
    warnings.push(`Có 'drop ... cascade' — kiểm kỹ, dễ xóa lan dữ liệu.`);
  });
  scan(/\bdelete\s+from\s+[^;]*;/gi, (m) => {
    if (!/where/i.test(m[0])) warnings.push(`DELETE thiếu WHERE — rất nguy hiểm, kiểm lại.`);
  });

  return { errors, warnings };
}

/** Chặn commit secret. */
function checkSecretPath(path) {
  const p = path.replace(/\\/g, "/");
  if (/(^|\/)\.env(\.local)?$/.test(p) && !p.endsWith(".example"))
    return [`Không được commit '${p}' (chứa khóa/bí mật). Đã có trong .gitignore.`];
  return [];
}

// ------------------------------------------------------------------ //
function git(args) {
  return execSync(`git ${args}`, { encoding: "utf8" }).trim();
}

function stagedFiles() {
  try {
    return git("diff --cached --name-only --diff-filter=ACM").split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function isModifiedVsHead(path) {
  try {
    git(`cat-file -e HEAD:"${path}"`); // tồn tại ở HEAD → là sửa file cũ
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ //
function report(allErrors, allWarnings) {
  if (allWarnings.length) {
    console.error("\n⚠️  CẢNH BÁO (không chặn):");
    for (const w of allWarnings) console.error("   - " + w);
  }
  if (allErrors.length) {
    console.error("\n⛔ CHẶN — vi phạm quy ước tên / an toàn (xem " + DICT + "):");
    for (const e of allErrors) console.error("   - " + e);
    console.error("\nSửa cho đúng sổ tên rồi thử lại. Cần tên mới → mở issue cho Leader.\n");
    return true;
  }
  console.error("✅ naming-guard: sạch.");
  return false;
}

function checkFileFromDisk(path) {
  const out = { errors: [], warnings: [] };
  out.errors.push(...checkSecretPath(path));
  if (isSqlMigration(path) && existsSync(path)) {
    const r = checkSql(path, readFileSync(path, "utf8"));
    out.errors.push(...r.errors.map((e) => `[${path}] ${e}`));
    out.warnings.push(...r.warnings.map((w) => `[${path}] ${w}`));
  }
  return out;
}

// ------------------------------------------------------------------ //
const mode = process.argv[2] ?? "--staged";
const allErrors = [];
const allWarnings = [];

if (mode === "--claude") {
  // Đọc JSON tool call từ stdin.
  let input = "";
  try {
    input = readFileSync(0, "utf8");
  } catch {
    process.exit(0);
  }
  let data = {};
  try {
    data = JSON.parse(input || "{}");
  } catch {
    process.exit(0);
  }
  const ti = data.tool_input ?? {};
  const path = ti.file_path ?? "";
  const content = ti.content ?? ti.new_string ?? "";
  if (path) {
    allErrors.push(...checkSecretPath(path));
    if (isSqlMigration(path) && content) {
      const r = checkSql(path, content);
      allErrors.push(...r.errors);
      allWarnings.push(...r.warnings);
    }
  }
  const blocked = report(allErrors, allWarnings);
  process.exit(blocked ? 2 : 0); // 2 = Claude Code chặn tool
} else if (mode === "--all") {
  let files = [];
  try {
    files = execSync("git ls-files supabase", { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    files = [];
  }
  for (const f of files) {
    const r = checkFileFromDisk(f);
    allErrors.push(...r.errors);
    allWarnings.push(...r.warnings);
  }
  process.exit(report(allErrors, allWarnings) ? 1 : 0);
} else if (mode === "--staged") {
  const files = stagedFiles();
  for (const f of files) {
    const r = checkFileFromDisk(f);
    allErrors.push(...r.errors);
    allWarnings.push(...r.warnings);
    // Chặn sửa migration đã đóng băng (trừ khi cho phép rõ ràng).
    const norm = f.replace(/\\/g, "/");
    if (FROZEN.includes(norm) && isModifiedVsHead(f) && process.env.ALLOW_MIGRATION_EDIT !== "1") {
      allErrors.push(
        `[${f}] Không sửa migration đã merge. Tạo migration MỚI (NNNN_*.sql). ` +
          `Nếu thật sự cần: đặt ALLOW_MIGRATION_EDIT=1 và báo Leader.`,
      );
    }
  }
  process.exit(report(allErrors, allWarnings) ? 1 : 0);
} else {
  // coi tham số là đường dẫn file
  const r = checkFileFromDisk(mode);
  process.exit(report(r.errors, r.warnings) ? 1 : 0);
}
