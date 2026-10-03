import { createClient } from "@/lib/supabase/server";
import type { PayoutStatus, RefundStatus, UserRole } from "@/types/domain";

// Truy vấn đọc cho khu Super Admin. Quyền đọc do RLS (fn_is_admin) quyết định.

type Row = Record<string, unknown>;
const nameOf = (rel: unknown) => ((rel as { full_name?: string } | null)?.full_name ?? null) || null;

// ------------------------------------------------------------------ //
// Nhật ký hoạt động
// ------------------------------------------------------------------ //
export interface ActivityEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorName: string | null;
}

export const AUDIT_PAGE_SIZE = 30;

export async function getAuditCourseOptions() {
  const supabase = createClient();
  const { data, error } = await supabase.from("courses").select("id, title").order("title");
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({ id: String(row.id), title: String(row.title) }));
}

export async function getActivityLog({
  page = 1,
  pageSize = AUDIT_PAGE_SIZE,
  action,
  entity,
  entityId,
  courseId,
}: { page?: number; pageSize?: number; action?: string; entity?: string; entityId?: string; courseId?: string } = {}) {
  const supabase = createClient();
  let query = supabase
    .from("activity_log")
    .select("id, action, entity, entity_id, reason, metadata, created_at, profiles(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  // like 'x%' để khớp cả log cũ dạng 'moderate_course:published' (trước 0010).
  if (action) query = query.like("action", `${action}%`);
  if (entity) query = query.eq("entity", entity);
  if (entityId) query = query.eq("entity_id", entityId);
  if (courseId) query = query.eq("metadata->>course_id", courseId);

  const { data, count, error } = await query;
  if (error) throw error;
  const entries: ActivityEntry[] = (data ?? []).map((row: Row) => ({
    id: String(row.id),
    action: String(row.action),
    entity: (row.entity as string | null) ?? null,
    entityId: (row.entity_id as string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    createdAt: String(row.created_at),
    actorName: nameOf(row.profiles),
  }));
  return { entries, total: count ?? 0 };
}

// ------------------------------------------------------------------ //
// Dashboard hệ thống
// ------------------------------------------------------------------ //
export async function getSuperAdminOverview() {
  const supabase = createClient();
  const [admins, superAdmins, pendingRefunds, draftPayouts, fee] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "super_admin"),
    supabase.from("refund").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payout").select("net").eq("status", "draft"),
    supabase.from("system_setting").select("value").eq("key", "platform_fee_percent").maybeSingle(),
  ]);

  return {
    adminCount: admins.count ?? 0,
    superAdminCount: superAdmins.count ?? 0,
    pendingRefundCount: pendingRefunds.count ?? 0,
    draftPayoutCount: draftPayouts.data?.length ?? 0,
    draftPayoutNet: (draftPayouts.data ?? []).reduce((sum: number, row: Row) => sum + Number(row.net), 0),
    platformFeePercent: fee.data ? Number(fee.data.value) : null,
  };
}

// ------------------------------------------------------------------ //
// Đội quản trị
// ------------------------------------------------------------------ //
export interface TeamMember {
  id: string;
  fullName: string;
  role: UserRole;
  isBanned: boolean;
  createdAt: string;
}

const toMember = (row: Row): TeamMember => ({
  id: String(row.id),
  fullName: String(row.full_name ?? ""),
  role: row.role as UserRole,
  isBanned: Boolean(row.is_banned),
  createdAt: String(row.created_at),
});

export async function getAdminTeam(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_banned, created_at")
    .in("role", ["super_admin", "admin"])
    .order("role", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toMember);
}

// Ứng viên để cấp quyền admin: học viên/giảng viên, tìm theo tên.
export async function searchGrantCandidates(keyword: string): Promise<TeamMember[]> {
  const cleaned = keyword.replace(/[%_,()*\\]/g, " ").trim();
  if (!cleaned) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_banned, created_at")
    .in("role", ["student", "instructor"])
    .ilike("full_name", `%${cleaned}%`)
    .order("full_name")
    .limit(10);
  if (error) throw error;
  return (data ?? []).map(toMember);
}

// ------------------------------------------------------------------ //
// Tài chính
// ------------------------------------------------------------------ //
export interface RefundRow {
  id: string;
  reason: string | null;
  status: RefundStatus;
  createdAt: string;
  resolvedAt: string | null;
  amount: number;
  courseTitle: string | null;
  studentName: string | null;
}

export async function getRefunds(status: RefundStatus): Promise<RefundRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("refund")
    .select("id, reason, status, created_at, resolved_at, payments(amount, courses(title), profiles(full_name))")
    .eq("status", status)
    .order("created_at", { ascending: status !== "pending" ? false : true })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row: Row) => {
    const payment = (row.payments as Row | null) ?? {};
    return {
      id: String(row.id),
      reason: (row.reason as string | null) ?? null,
      status: row.status as RefundStatus,
      createdAt: String(row.created_at),
      resolvedAt: (row.resolved_at as string | null) ?? null,
      amount: Number(payment.amount ?? 0),
      courseTitle: (payment.courses as { title?: string } | null)?.title ?? null,
      studentName: nameOf(payment.profiles),
    };
  });
}

export interface PayoutRow {
  id: string;
  period: string;
  instructorName: string | null;
  gross: number;
  platformFee: number;
  net: number;
  status: PayoutStatus;
}

export async function getPayouts(period?: string): Promise<PayoutRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("payout")
    .select("id, period, gross, platform_fee, net, status, profiles(full_name)")
    .order("period", { ascending: false })
    .order("net", { ascending: false })
    .limit(200);
  if (period) query = query.eq("period", period);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({
    id: String(row.id),
    period: String(row.period),
    instructorName: nameOf(row.profiles),
    gross: Number(row.gross),
    platformFee: Number(row.platform_fee),
    net: Number(row.net),
    status: row.status as PayoutStatus,
  }));
}

// ------------------------------------------------------------------ //
// Cấu hình
// ------------------------------------------------------------------ //
export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

export async function getSettings(): Promise<SettingRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("system_setting").select("key, value, updated_at").order("key");
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({ key: String(row.key), value: row.value, updatedAt: String(row.updated_at) }));
}
