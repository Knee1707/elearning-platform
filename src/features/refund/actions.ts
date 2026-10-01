"use server";

import { requestRefund } from "@/lib/queries/commerce";
import { runAction } from "@/features/admin/runAction";
import type { UserRole } from "@/types/domain";

// Ai đăng nhập cũng gửi được cho giao dịch CỦA MÌNH (fn_request_refund kiểm quyền sở hữu,
// hạn hoàn tiền, trùng yêu cầu; trigger chặn tài khoản bị khóa).
const ANY_ROLE: UserRole[] = ["student", "instructor", "admin", "super_admin"];

export async function requestRefundAction(formData: FormData) {
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  await runAction({
    path: "/my/purchases",
    roles: ANY_ROLE,
    success: "Đã gửi yêu cầu hoàn tiền. Bạn sẽ nhận thông báo khi có kết quả.",
    task: () => requestRefund(paymentId, reason),
  });
}
