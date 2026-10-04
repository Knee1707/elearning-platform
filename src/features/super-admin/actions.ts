"use server";

import { createClient } from "@/lib/supabase/server";
import {
  approveRefund,
  rejectRefund,
  setRole,
  toggleBan,
} from "@/lib/queries/admin";
import type { UserRole } from "@/types/domain";
import { runAction } from "@/features/admin/runAction";
import { SETTING_DEFS, parseSettingInput } from "./settings";

// Mọi action của khu Super Admin: chỉ super_admin (DB kiểm lại bằng fn_is_super_admin).
const ROLES: UserRole[] = ["super_admin"];

export async function setUserRoleAction(formData: FormData) {
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) as UserRole;
  await runAction({ path: "/super-admin/admins", roles: ROLES, success: "Đã cập nhật vai trò.", task: () => setRole(userId, role) });
}

export async function toggleBanAction(formData: FormData) {
  const userId = String(formData.get("userId"));
  const reason = String(formData.get("reason") ?? "");
  await runAction({
    path: "/super-admin/admins",
    roles: ROLES,
    success: (banned) => (banned ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản."),
    task: () => toggleBan(userId, reason),
  });
}

export async function approveRefundAction(formData: FormData) {
  const refundId = String(formData.get("refundId"));
  await runAction({
    path: "/super-admin/refunds",
    roles: ROLES,
    success: "Đã duyệt hoàn tiền.",
    task: () => approveRefund(refundId),
    returnTo: formData.get("returnTo"),
  });
}

export async function rejectRefundAction(formData: FormData) {
  const refundId = String(formData.get("refundId"));
  const reason = String(formData.get("reason") ?? "");
  await runAction({
    path: "/super-admin/refunds",
    roles: ROLES,
    success: "Đã từ chối yêu cầu hoàn tiền.",
    task: () => rejectRefund(refundId, reason),
    returnTo: formData.get("returnTo"),
  });
}

export async function saveSettingsAction(formData: FormData) {
  await runAction({
    path: "/super-admin/settings",
    roles: ROLES,
    success: "Đã lưu cấu hình.",
    task: async () => {
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
    },
  });
}
