#!/usr/bin/env node
/**
 * check-m2.mjs — Kiểm tra toàn bộ yêu cầu M2 (TĨNH, không cần DB)
 *
 * Cách chạy:
 *   node scripts/check-m2.mjs
 *
 * Kiểm tra:
 *   1. migration 0005 có đủ fn/trigger/view theo PHAN_CONG.md mục 9.5
 *   2. lib/queries/{progress,quiz,attendance,qa}.ts không còn TODO/throws
 *   3. seed.sql phần M2 có đủ domain dữ liệu
 *   4. Hợp đồng Data↔App (mục 6): hàm TS export khớp hàm SQL
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// ── Màu terminal ────────────────────────────────────────────────────────
const G = "\x1b[32m"; // green
const R = "\x1b[31m"; // red
const Y = "\x1b[33m"; // yellow
const B = "\x1b[36m"; // cyan
const W = "\x1b[1m";  // bold
const X = "\x1b[0m";  // reset

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ${G}✓${X} ${label}`);
  passed++;
}
function fail(label, hint = "") {
  console.log(`  ${R}✗${X} ${label}${hint ? `\n      ${Y}→ ${hint}${X}` : ""}`);
  failed++;
}
function section(title) {
  console.log(`\n${W}${B}── ${title} ──${X}`);
}
function read(relPath) {
  const abs = path.join(process.cwd(), relPath);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf8");
}

// ════════════════════════════════════════════════════════════════════════
// 1. MIGRATION 0005 — fn / trigger / view
// ════════════════════════════════════════════════════════════════════════
section("1. supabase/migrations/0005_learning_logic.sql");

const sql = read("supabase/migrations/0005_learning_logic.sql");

const REQUIRED_FN = [
  // Tiến độ
  "fn_update_watch",
  "fn_save_position",
  "fn_mark_complete",
  // Chấm điểm
  "fn_get_quiz",
  "fn_submit_attempt",
  // Chứng chỉ
  "fn_verify_certificate",
  // Điểm danh
  "fn_join_live_session",
  // Q&A + thông báo
  "fn_add_note",
  "fn_ask_question",
  "fn_answer_question",
  "fn_mark_read",
];

const REQUIRED_TRIGGERS = [
  "trg_issue_certificate",
  "trg_attendance_on_video",
];

const REQUIRED_VIEWS = [
  "view_course_progress",
  "view_attendance",
  "view_certificate",
];

for (const fn of REQUIRED_FN) {
  const found =
    sql.includes(`function ${fn}(`) ||
    sql.includes(`function ${fn} (`);
  found
    ? ok(`fn ${fn} được định nghĩa`)
    : fail(`fn ${fn} THIẾU trong 0005`, "Thêm create or replace function " + fn + "...");
}

for (const trg of REQUIRED_TRIGGERS) {
  const found = sql.includes(`trigger ${trg}`);
  found
    ? ok(`trigger ${trg} được tạo`)
    : fail(`trigger ${trg} THIẾU`, "Thêm create trigger " + trg + "...");
}

for (const v of REQUIRED_VIEWS) {
  const found = sql.includes(`view ${v}`);
  found
    ? ok(`view ${v} được tạo`)
    : fail(`view ${v} THIẾU`, "Thêm create or replace view " + v + "...");
}

// Kiểm tra stub rỗng (TODO còn lại)
if (sql.includes("TODO(M2)") && sql.trim().split("\n").length < 80) {
  fail("File 0005 còn là stub rỗng (< 80 dòng thực)");
} else {
  ok("File 0005 đã điền thân (không còn TODO rỗng)");
}

// Điểm danh: đọc ngưỡng từ system_setting, không hard-code
if (sql.includes("attendance_video_percent") && !sql.match(/watched_percent\s*>=\s*9[0-9]/)) {
  ok("Ngưỡng điểm danh đọc từ system_setting (không hard-code)");
} else if (sql.includes("attendance_video_percent")) {
  ok("Ngưỡng điểm danh tham chiếu attendance_video_percent");
} else {
  fail("Ngưỡng điểm danh nên đọc từ system_setting.attendance_video_percent");
}

// Chống gian lận: fn_get_quiz không trả is_correct
const getQuizBody = sql.match(/function fn_get_quiz[\s\S]*?\$\$/)?.[0] ?? "";
if (getQuizBody && !getQuizBody.includes("is_correct")) {
  ok("fn_get_quiz KHÔNG trả is_correct (chống gian lận ✓)");
} else if (!getQuizBody) {
  fail("Không tìm thấy thân fn_get_quiz");
} else {
  fail("fn_get_quiz đang trả is_correct — HỌC VIÊN CÓ THỂ GIAN LẬN");
}

// ════════════════════════════════════════════════════════════════════════
// 2. lib/queries/progress.ts
// ════════════════════════════════════════════════════════════════════════
section("2. lib/queries/progress.ts");

const progressTs = read("src/lib/queries/progress.ts");

const PROGRESS_EXPORTS = [
  { export: "updateWatch",      rpc: "fn_update_watch" },
  { export: "savePosition",     rpc: "fn_save_position" },
  { export: "markComplete",     rpc: "fn_mark_complete" },
  { export: "getCourseProgress",rpc: "view_course_progress" },
];

for (const { export: fn, rpc } of PROGRESS_EXPORTS) {
  if (progressTs.includes(`export async function ${fn}`) || progressTs.includes(`export function ${fn}`)) {
    ok(`${fn} exported`);
  } else {
    fail(`${fn} THIẾU export`, `Thêm export async function ${fn}(...)`);
  }
  if (progressTs.includes(rpc)) {
    ok(`  └─ gọi đúng "${rpc}"`);
  } else {
    fail(`  └─ KHÔNG gọi "${rpc}"`, `Hàm phải gọi supabase.rpc("${rpc}") hoặc .from("${rpc}")`);
  }
  if (progressTs.includes("throw new Error(\"TODO")) {
    fail(`  └─ Còn TODO throw — chưa điền thân!`);
  }
}

// ════════════════════════════════════════════════════════════════════════
// 3. lib/queries/quiz.ts
// ════════════════════════════════════════════════════════════════════════
section("3. lib/queries/quiz.ts");

const quizTs = read("src/lib/queries/quiz.ts");

const QUIZ_EXPORTS = [
  { export: "getQuiz",           rpc: "fn_get_quiz" },
  { export: "submitAttempt",     rpc: "fn_submit_attempt" },
  { export: "verifyCertificate", rpc: "fn_verify_certificate" },
];

for (const { export: fn, rpc } of QUIZ_EXPORTS) {
  if (quizTs.includes(`export async function ${fn}`) || quizTs.includes(`export function ${fn}`)) {
    ok(`${fn} exported`);
  } else {
    fail(`${fn} THIẾU export`);
  }
  if (quizTs.includes(rpc)) {
    ok(`  └─ gọi đúng "${rpc}"`);
  } else {
    fail(`  └─ KHÔNG gọi "${rpc}"`);
  }
}

// Anti-cheat check: submitAttempt không tự chấm điểm phía client
if (quizTs.includes("is_correct")) {
  fail("quiz.ts đang xử lý is_correct phía client — chấm điểm PHẢI ở DB");
} else {
  ok("submitAttempt không tự chấm phía client (is_correct ẩn ✓)");
}

// ════════════════════════════════════════════════════════════════════════
// 4. lib/queries/attendance.ts
// ════════════════════════════════════════════════════════════════════════
section("4. lib/queries/attendance.ts");

const attendanceTs = read("src/lib/queries/attendance.ts");

const ATTENDANCE_EXPORTS = [
  { export: "joinLiveSession",    rpc: "fn_join_live_session" },
  { export: "getMyAttendance",    rpc: "view_attendance" },
  { export: "getClassAttendance", rpc: "view_attendance" },
];

for (const { export: fn, rpc } of ATTENDANCE_EXPORTS) {
  if (attendanceTs.includes(`export async function ${fn}`) || attendanceTs.includes(`export function ${fn}`)) {
    ok(`${fn} exported`);
  } else {
    fail(`${fn} THIẾU export`);
  }
  if (attendanceTs.includes(rpc)) {
    ok(`  └─ gọi đúng "${rpc}"`);
  } else {
    fail(`  └─ KHÔNG gọi "${rpc}"`);
  }
}

// ════════════════════════════════════════════════════════════════════════
// 5. lib/queries/qa.ts
// ════════════════════════════════════════════════════════════════════════
section("5. lib/queries/qa.ts");

const qaTs = read("src/lib/queries/qa.ts");

const QA_EXPORTS = [
  { export: "addNote",          rpc: "fn_add_note" },
  { export: "askQuestion",      rpc: "fn_ask_question" },
  { export: "answerQuestion",   rpc: "fn_answer_question" },
  { export: "markRead",         rpc: "fn_mark_read" },
];

for (const { export: fn, rpc } of QA_EXPORTS) {
  if (qaTs.includes(`export async function ${fn}`) || qaTs.includes(`export function ${fn}`)) {
    ok(`${fn} exported`);
  } else {
    fail(`${fn} THIẾU export`);
  }
  if (qaTs.includes(rpc)) {
    ok(`  └─ gọi đúng "${rpc}"`);
  } else {
    fail(`  └─ KHÔNG gọi "${rpc}"`);
  }
}

// ════════════════════════════════════════════════════════════════════════
// 6. seed.sql — phần M2
// ════════════════════════════════════════════════════════════════════════
section("6. supabase/seed.sql — phần M2");

const seed = read("supabase/seed.sql");

const SEED_DOMAINS = [
  { label: "enrollments",     keyword: "insert into enrollments" },
  { label: "lesson_progress", keyword: "insert into lesson_progress" },
  { label: "quizzes",         keyword: "insert into quizzes" },
  { label: "questions",       keyword: "insert into questions" },
  { label: "options",         keyword: "insert into options" },
  { label: "exams",           keyword: "insert into exams" },
  { label: "exam_attempts",   keyword: "insert into exam_attempts" },
  { label: "answers",         keyword: "insert into answers" },
  { label: "certificates",    keyword: "insert into certificates" },
  { label: "live_sessions",   keyword: "insert into live_sessions" },
  { label: "attendance",      keyword: "insert into attendance" },
  { label: "qa_question",     keyword: "insert into qa_question" },
  { label: "qa_answer",       keyword: "insert into qa_answer" },
  { label: "lesson_note",     keyword: "insert into lesson_note" },
  { label: "notification",    keyword: "insert into notification" },
];

for (const { label, keyword } of SEED_DOMAINS) {
  seed.toLowerCase().includes(keyword.toLowerCase())
    ? ok(`seed có dữ liệu ${label}`)
    : fail(`seed THIẾU dữ liệu ${label}`, `Thêm "${keyword} ..." vào seed.sql phần M2`);
}

// Kiểm tra nguồn điểm danh video + live
if (seed.includes("'video'") && seed.includes("'live'")) {
  ok("seed có cả 2 nguồn điểm danh: video + live");
} else {
  fail("seed thiếu 1 trong 2 nguồn điểm danh (video / live)");
}

// ════════════════════════════════════════════════════════════════════════
// 7. Quy tắc đặt tên (mục 4 PHAN_CONG.md)
// ════════════════════════════════════════════════════════════════════════
section("7. Quy tắc đặt tên — Naming conventions");

// A. SQL: fn_ / trg_ / view_ / idx_
const sqlFiles = [
  "supabase/migrations/0005_learning_logic.sql",
  "supabase/seed.sql",
];
let badNames = [];
for (const f of sqlFiles) {
  const content = read(f);
  // Tìm create function không có fn_
  for (const m of content.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(\w+)\s*\(/gi)) {
    if (!m[1].startsWith("fn_")) badNames.push(`[${f}] function '${m[1]}' phải có tiền tố fn_`);
  }
  // Tìm create trigger không có trg_
  for (const m of content.matchAll(/create\s+(?:constraint\s+)?trigger\s+(\w+)/gi)) {
    if (!m[1].startsWith("trg_")) badNames.push(`[${f}] trigger '${m[1]}' phải có tiền tố trg_`);
  }
  // Tìm create view không có view_
  for (const m of content.matchAll(/create\s+(?:or\s+replace\s+)?view\s+(\w+)/gi)) {
    if (!m[1].startsWith("view_")) badNames.push(`[${f}] view '${m[1]}' phải có tiền tố view_`);
  }
}
if (badNames.length === 0) {
  ok("Tên SQL: fn_* / trg_* / view_* đúng quy ước");
} else {
  for (const b of badNames) fail(b);
}

// B. TS: export functions camelCase
const tsFiles = [
  "src/lib/queries/progress.ts",
  "src/lib/queries/quiz.ts",
  "src/lib/queries/attendance.ts",
  "src/lib/queries/qa.ts",
];
let badTs = [];
for (const f of tsFiles) {
  const content = read(f);
  for (const m of content.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_]\w*)/g)) {
    const name = m[1];
    // camelCase: bắt đầu chữ thường, không có gạch dưới
    if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      badTs.push(`[${f}] export function '${name}' nên là camelCase`);
    }
  }
}
if (badTs.length === 0) {
  ok("Tên TS export: camelCase đúng quy ước");
} else {
  for (const b of badTs) fail(b);
}

// ════════════════════════════════════════════════════════════════════════
// 8. Hợp đồng Data↔App — kiểm chéo (mục 6 PHAN_CONG.md)
// ════════════════════════════════════════════════════════════════════════
section("8. Hợp đồng Data↔App — kiểm chéo SQL ↔ TS");

const CONTRACT = [
  { rpc: "fn_update_watch",       ts: "src/lib/queries/progress.ts",    fn: "updateWatch" },
  { rpc: "fn_save_position",      ts: "src/lib/queries/progress.ts",    fn: "savePosition" },
  { rpc: "fn_mark_complete",      ts: "src/lib/queries/progress.ts",    fn: "markComplete" },
  { rpc: "view_course_progress",  ts: "src/lib/queries/progress.ts",    fn: "getCourseProgress" },
  { rpc: "fn_get_quiz",           ts: "src/lib/queries/quiz.ts",        fn: "getQuiz" },
  { rpc: "fn_submit_attempt",     ts: "src/lib/queries/quiz.ts",        fn: "submitAttempt" },
  { rpc: "fn_verify_certificate", ts: "src/lib/queries/quiz.ts",        fn: "verifyCertificate" },
  { rpc: "fn_join_live_session",  ts: "src/lib/queries/attendance.ts",  fn: "joinLiveSession" },
  { rpc: "view_attendance",       ts: "src/lib/queries/attendance.ts",  fn: "getMyAttendance" },
  { rpc: "fn_add_note",           ts: "src/lib/queries/qa.ts",          fn: "addNote" },
  { rpc: "fn_ask_question",       ts: "src/lib/queries/qa.ts",          fn: "askQuestion" },
  { rpc: "fn_answer_question",    ts: "src/lib/queries/qa.ts",          fn: "answerQuestion" },
  { rpc: "fn_mark_read",          ts: "src/lib/queries/qa.ts",          fn: "markRead" },
];

for (const { rpc, ts, fn } of CONTRACT) {
  const sqlHas = sql.includes(rpc);
  const tsContent = read(ts);
  const tsHas = tsContent.includes(rpc);
  const exportHas = tsContent.includes(`export async function ${fn}`) || tsContent.includes(`export function ${fn}`);

  if (sqlHas && tsHas && exportHas) {
    ok(`${rpc} ↔ ${fn}() — SQL ✓  TS ✓  export ✓`);
  } else {
    const missing = [];
    if (!sqlHas) missing.push("THIẾU trong SQL");
    if (!tsHas)  missing.push("THIẾU gọi trong TS");
    if (!exportHas) missing.push("THIẾU export function");
    fail(`${rpc} ↔ ${fn}()`, missing.join(" | "));
  }
}

// ════════════════════════════════════════════════════════════════════════
// TỔNG KẾT
// ════════════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(60));
console.log(`${W}TỔNG KẾT M2 CHECK:${X}  ${G}${passed} passed${X}  ${failed > 0 ? R : G}${failed} failed${X}`);
console.log("═".repeat(60));

if (failed > 0) {
  console.log(`\n${Y}Các mục thất bại cần sửa trước khi submit.${X}`);
  console.log(`${Y}Xem chi tiết từng lỗi ở trên.${X}\n`);
  process.exit(1);
} else {
  console.log(`\n${G}✅ Toàn bộ yêu cầu M2 (tĩnh) đã đáp ứng.${X}`);
  console.log(`${B}→ Bước tiếp theo: chạy check-m2-live.sql trên Supabase DB thật.${X}\n`);
  process.exit(0);
}
