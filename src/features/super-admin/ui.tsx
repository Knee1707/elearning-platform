import { CheckCircle2, AlertTriangle } from "lucide-react";
import { ROLE_LABELS } from "@/lib/utils";
import type { UserRole } from "@/types/domain";
import type { ActivityEntry } from "./queries";

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
  moderate_review: "Kiểm duyệt review",
  resolve_report: "Xử lý báo cáo",
  approve_refund: "Duyệt hoàn tiền",
  generate_payout: "Tạo payout",
  update_setting: "Sửa cấu hình",
  delete_setting: "Xóa cấu hình",
};

export const ENTITY_LABELS: Record<string, string> = {
  user: "Người dùng",
  course: "Khóa học",
  review: "Review",
  report: "Báo cáo",
  refund: "Hoàn tiền",
  payout: "Payout",
  setting: "Cấu hình",
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
    case "update_setting":
    case "delete_setting":
      return { label, detail: `${show(m.key)}: ${show(m.from)} → ${show(m.to)}` };
    default:
      return { label, detail: Object.keys(m).length ? JSON.stringify(m) : "" };
  }
}
