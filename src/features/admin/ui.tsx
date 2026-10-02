import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { ROLE_LABELS } from "@/lib/utils";
import type { UserRole } from "@/types/domain";
import type { ActivityEntry } from "@/features/super-admin/queries";

export const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
export const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

export type SearchParams = Record<string, string | string[] | undefined>;
export const param = (sp: SearchParams, key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

// Thông báo kết quả của server action (?ok= / ?error=).
export function FlashMessage({ searchParams }: { searchParams: SearchParams }) {
  const ok = param(searchParams, "ok");
  const error = param(searchParams, "error");
  if (!ok && !error) return null;
  return error ? (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      {error}
    </p>
  ) : (
    <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      {ok}
    </p>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const tone =
    role === "super_admin"
      ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
      : role === "admin"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{ROLE_LABELS[role] ?? role}</span>;
}

// ------------------------------------------------------------------ //
// Nhật ký: nhãn hành động + mô tả ngắn từ metadata
// ------------------------------------------------------------------ //
export const ACTION_LABELS: Record<string, string> = {
  set_role: "Đổi vai trò",
  ban_user: "Khóa tài khoản",
  unban_user: "Mở khóa tài khoản",
  moderate_course: "Kiểm duyệt khóa học",
  approve_video: "Duyệt video",
  reject_video: "Từ chối video",
  moderate_review: "Kiểm duyệt review",
  resolve_report: "Xử lý báo cáo",
  approve_refund: "Duyệt hoàn tiền",
  reject_refund: "Từ chối hoàn tiền",
  generate_payout: "Tạo payout",
  mark_payout_paid: "Chi trả payout",
  broadcast_notification: "Gửi thông báo",
  delete_qa: "Xóa hỏi đáp",
  revoke_certificate: "Thu hồi chứng chỉ",
  restore_certificate: "Khôi phục chứng chỉ",
  update_setting: "Sửa cấu hình",
  delete_setting: "Xóa cấu hình",
};

export const ENTITY_LABELS: Record<string, string> = {
  user: "Người dùng",
  course: "Khóa học",
  review: "Review",
  report: "Báo cáo",
  lesson: "Bài học",
  refund: "Hoàn tiền",
  payout: "Payout",
  setting: "Cấu hình",
  notification: "Thông báo",
  qa_question: "Câu hỏi Q&A",
  qa_answer: "Trả lời Q&A",
  certificate: "Chứng chỉ",
};

const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));
const roleName = (v: unknown) => ROLE_LABELS[v as UserRole] ?? show(v);

export function describeActivity(entry: ActivityEntry): { label: string; detail: string } {
  // Log cũ (trước 0010) dạng 'moderate_course:published'.
  const [base, legacyStatus] = entry.action.split(":");
  const m = entry.metadata;
  const label = ACTION_LABELS[base] ?? entry.action;
  switch (base) {
    case "set_role":
      return { label, detail: `${roleName(m.from)} → ${roleName(m.to)}` };
    case "moderate_course":
    case "moderate_review":
    case "resolve_report":
      return { label, detail: legacyStatus ? `→ ${legacyStatus}` : `${show(m.from)} → ${show(m.to)}` };
    case "approve_refund":
      return { label, detail: m.amount !== undefined ? money.format(Number(m.amount)) : "" };
    case "generate_payout":
      return { label, detail: `Kỳ ${show(m.period)} · phí ${show(m.fee_percent)}%` };
    case "mark_payout_paid":
      return { label, detail: `Kỳ ${show(m.period)} · ${money.format(Number(m.net ?? 0))}` };
    case "reject_refund":
      return { label, detail: "" };
    case "delete_qa":
      return { label, detail: `"${String(m.content ?? "").slice(0, 80)}"` };
    case "revoke_certificate":
    case "restore_certificate":
      return { label, detail: show(m.code) };
    case "broadcast_notification":
      return { label, detail: `"${show(m.title)}" → ${show(m.recipients)} người nhận` };
    case "update_setting":
    case "delete_setting":
      return { label, detail: `${show(m.key)}: ${show(m.from)} → ${show(m.to)}` };
    default:
      return { label, detail: Object.keys(m).length ? JSON.stringify(m) : "" };
  }
}

// ------------------------------------------------------------------ //
// Nút mở ô nhập lý do rồi gửi (dùng <details>, không cần JS phía client).
// Dùng cho: từ chối/ẩn khóa học, khóa tài khoản, từ chối hoàn tiền.
// ------------------------------------------------------------------ //
export function ReasonAction({
  action,
  label,
  submitLabel,
  hidden,
  placeholder = "Nhập lý do (bắt buộc)…",
}: {
  action: (formData: FormData) => Promise<void>;
  label: string;
  submitLabel?: string;
  hidden: Record<string, string>;
  placeholder?: string;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none rounded border border-border px-3 py-2 text-center text-sm hover:bg-muted group-open:bg-muted [&::-webkit-details-marker]:hidden">
        {label}
      </summary>
      <form action={action} className="mt-2 w-64 max-w-[calc(100vw-3rem)] space-y-2 rounded-lg border border-border bg-background p-3 shadow-sm">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <textarea
          name="reason"
          required
          minLength={3}
          maxLength={500}
          rows={3}
          aria-label="Lý do"
          placeholder={placeholder}
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button type="submit" className="w-full rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
          {submitLabel ?? label}
        </button>
      </form>
    </details>
  );
}

// ------------------------------------------------------------------ //
// Nút xác nhận hành động nguy hiểm (không cần lý do) — dùng cho Xóa.
// ------------------------------------------------------------------ //
export function ConfirmAction({
  action,
  label,
  message,
  submitLabel,
  hidden,
}: {
  action: (formData: FormData) => Promise<void>;
  label: string;
  message: string;
  submitLabel?: string;
  hidden: Record<string, string>;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-medium text-red-600 underline hover:text-red-700 dark:text-red-400 [&::-webkit-details-marker]:hidden">
        {label}
      </summary>
      <form action={action} className="mt-2 w-64 max-w-[calc(100vw-3rem)] space-y-2 rounded-lg border border-border bg-background p-3 shadow-sm">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <p className="text-sm text-muted-foreground">{message}</p>
        <button type="submit" className="w-full rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
          {submitLabel ?? label}
        </button>
      </form>
    </details>
  );
}

// ------------------------------------------------------------------ //
// Tab lọc dạng link (giữ trạng thái trên URL, không cần JS).
// ------------------------------------------------------------------ //
export function FilterTabs({
  tabs,
  active,
  hrefFor,
  label,
}: {
  tabs: { value: string; label: string }[];
  active: string;
  hrefFor: (value: string) => string;
  label: string;
}) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-border" aria-label={label}>
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={hrefFor(tab.value)}
          aria-current={tab.value === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            tab.value === active
              ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Phân trang">
      <span className="text-muted-foreground">
        Trang {page}/{pageCount} · {total} kết quả
      </span>
      <div className="flex gap-2">
        {page > 1 && <Link href={hrefFor(page - 1)} className="rounded border border-border px-3 py-1.5 hover:bg-muted">Trước</Link>}
        {page < pageCount && <Link href={hrefFor(page + 1)} className="rounded border border-border px-3 py-1.5 hover:bg-muted">Sau</Link>}
      </div>
    </nav>
  );
}

// Dựng query string, bỏ giá trị rỗng.
export function buildHref(path: string, params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") qs.set(key, String(value));
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}
