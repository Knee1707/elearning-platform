"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/auth";

export type ReportEntity = "course" | "review" | "user";
export interface ReportFormState {
  ok?: string;
  error?: string;
}

const ENTITIES: ReportEntity[] = ["course", "review", "user"];

// Gửi báo cáo vi phạm. fn_submit_report kiểm đối tượng tồn tại, chống tự báo cáo
// và chống trùng báo cáo đang mở; trigger chặn tài khoản bị khóa.
export async function submitReportAction(_prev: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const entity = String(formData.get("entity") ?? "") as ReportEntity;
  const entityId = String(formData.get("entityId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!ENTITIES.includes(entity) || !entityId) return { error: "Không xác định được nội dung cần báo cáo." };
  if (!(await getCurrentUser())) return { error: "Vui lòng đăng nhập để gửi báo cáo." };

  const supabase = createClient();
  const { error } = await supabase.rpc("fn_submit_report", {
    p_entity: entity,
    p_entity_id: entityId,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  return { ok: "Cảm ơn bạn! Báo cáo đã được gửi tới quản trị viên." };
}
