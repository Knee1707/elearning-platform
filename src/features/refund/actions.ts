"use server";

import { runAction } from "@/features/admin/runAction";
import type { UserRole } from "@/types/domain";

// Chính sách: Khóa học một khi đã mua sẽ không được hoàn tiền ở bất kỳ vai trò nào.
const ANY_ROLE: UserRole[] = ["student", "instructor", "admin", "super_admin"];

export async function requestRefundAction(_formData: FormData) {
  await runAction({
    path: "/my/purchases",
    roles: ANY_ROLE,
    success: "",
    task: async () => {
      throw new Error("Chính sách hệ thống: Khóa học một khi đã mua sẽ không được hoàn tiền.");
    },
  });
}

