import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus, RefundStatus } from "@/types/domain";

// Lịch sử mua + trạng thái hoàn tiền của CHÍNH người đang đăng nhập
// (RLS payments_select_own / refund_select_own).

type Row = Record<string, unknown>;

export const DEFAULT_REFUND_WINDOW_DAYS = 7;

export interface Purchase {
  id: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  courseTitle: string | null;
  courseSlug: string | null;
  refunds: { id: string; status: RefundStatus; reason: string | null; createdAt: string; resolvedAt: string | null }[];
}

export async function getMyPurchases(userId: string): Promise<Purchase[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, status, created_at, courses(title, slug), refund(id, status, reason, created_at, resolved_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Row) => {
    const course = row.courses as { title?: string; slug?: string } | null;
    const refunds = ((row.refund as Row[] | null) ?? [])
      .map((r) => ({
        id: String(r.id),
        status: r.status as RefundStatus,
        reason: (r.reason as string | null) ?? null,
        createdAt: String(r.created_at),
        resolvedAt: (r.resolved_at as string | null) ?? null,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      id: String(row.id),
      amount: Number(row.amount),
      status: row.status as PaymentStatus,
      createdAt: String(row.created_at),
      courseTitle: course?.title ?? null,
      courseSlug: course?.slug ?? null,
      refunds,
    };
  });
}

export async function getRefundWindowDays(): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase.from("system_setting").select("value").eq("key", "refund_window_days").maybeSingle();
  const days = Number(data?.value);
  return Number.isFinite(days) && days >= 0 ? days : DEFAULT_REFUND_WINDOW_DAYS;
}

// Khớp điều kiện trong fn_request_refund (DB kiểm lại lần nữa).
export function refundEligibility(purchase: Purchase, windowDays: number, now = new Date()) {
  const latest = purchase.refunds[0];
  if (purchase.status !== "paid") return { eligible: false, reason: null } as const;
  if (latest && (latest.status === "pending" || latest.status === "approved")) return { eligible: false, reason: null } as const;
  const deadline = new Date(new Date(purchase.createdAt).getTime() + windowDays * 86_400_000);
  if (now > deadline) return { eligible: false, reason: `Đã quá hạn ${windowDays} ngày kể từ khi mua` } as const;
  return { eligible: true, reason: null, deadline } as const;
}
