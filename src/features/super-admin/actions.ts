"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { approveRefund, generatePayout, setRole, toggleBan } from "@/lib/queries/admin";
import type { UserRole } from "@/types/domain";
import { SETTING_DEFS, parseSettingInput } from "./settings";

// Mọi action: kiểm super_admin ở app (UX) — DB kiểm lại bằng fn_is_super_admin.
// Kết quả báo qua query ?ok= / ?error= để trang hiện thông báo thay vì trang lỗi.

function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Có lỗi xảy ra, vui lòng thử lại.";
}

async function runAction(path: string, successMessage: string, task: () => Promise<unknown>) {
  let error: string | null = null;
  try {
    await requireRole(["super_admin"]);
    await task();
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath(path);
  redirect(`${path}?${new URLSearchParams(error ? { error } : { ok: successMessage })}`);
}

export async function setUserRoleAction(formData: FormData) {
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) as UserRole;
  await runAction("/super-admin/admins", "Đã cập nhật vai trò.", () => setRole(userId, role));
}

export async function toggleBanAction(formData: FormData) {
  const userId = String(formData.get("userId"));
  await runAction("/super-admin/admins", "Đã cập nhật trạng thái khóa.", () => toggleBan(userId));
}

export async function approveRefundAction(formData: FormData) {
  const refundId = String(formData.get("refundId"));
  await runAction("/super-admin/refunds", "Đã duyệt hoàn tiền.", () => approveRefund(refundId));
}

export async function generatePayoutAction(formData: FormData) {
  const period = String(formData.get("period") ?? "");
  await runAction("/super-admin/payouts", `Đã tạo payout kỳ ${period}.`, () => generatePayout(period));
}

export async function saveSettingsAction(formData: FormData) {
  await runAction("/super-admin/settings", "Đã lưu cấu hình.", async () => {
    const supabase = createClient();
    const { data: current, error: readError } = await supabase.from("system_setting").select("key, value");
    if (readError) throw readError;
    const currentByKey = new Map((current ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));

    const changes: { key: string; value: number | string; updated_at: string }[] = [];
    for (const def of SETTING_DEFS) {
      const parsed = parseSettingInput(def, String(formData.get(def.key) ?? ""));
      if ("error" in parsed) throw new Error(parsed.error);
      if (currentByKey.get(def.key) !== parsed.value) {
        changes.push({ key: def.key, value: parsed.value, updated_at: new Date().toISOString() });
      }
    }
    if (changes.length === 0) return;
    // Trigger trg_system_setting_audit ghi activity_log cho từng khóa thay đổi.
    const { error } = await supabase.from("system_setting").upsert(changes);
    if (error) throw error;
  });
}
