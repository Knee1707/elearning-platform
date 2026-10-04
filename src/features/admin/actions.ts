"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyProfile } from "@/lib/queries/auth";
import {
  broadcastNotification,
  moderateCourse,
  moderateQa,
  moderateReview,
  resolveReport,
  revokeCertificate,
  setRole,
  toggleBan,
} from "@/lib/queries/admin";
import { ADMIN_ROLES, isAdminRole, slugify } from "@/lib/utils";
import type { CourseStatus, ReportStatus, ReviewStatus, UserRole } from "@/types/domain";
import { runAction } from "./runAction";

// Server action của khu Admin (admin + super_admin). DB kiểm quyền lại trong
// mọi hàm definer / policy RLS; ở đây chỉ gom kết quả thành ?ok= / ?error=.

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

// ------------------------------------------------------------------ //
// Khóa học
// ------------------------------------------------------------------ //
export async function moderateCourseAction(formData: FormData) {
  const status = text(formData, "status") as CourseStatus;
  const messages: Partial<Record<CourseStatus, string>> = {
    published: "Đã duyệt / xuất bản khóa học lên phần Khám phá khóa học.",
    rejected: "Đã từ chối khóa học và báo cho giảng viên.",
    hidden: "Đã ẩn khóa học và báo cho giảng viên.",
  };
  await runAction({
    path: "/admin/courses",
    roles: ADMIN_ROLES,
    success: messages[status] ?? "Đã cập nhật trạng thái.",
    task: async () => {
      await moderateCourse(text(formData, "courseId"), status, text(formData, "reason") || undefined);
      revalidatePath("/courses");
      revalidatePath("/");
      revalidatePath("/admin/video-reviews");
      revalidatePath("/admin/courses");
    },
    returnTo: formData.get("returnTo"),
  });
}

/**
 * Xóa khóa học bởi Quản trị viên, đồng bộ xóa khỏi toàn bộ hệ thống (Giảng viên Studio, Học viên Góc học tập, Khám phá)
 */
export async function adminDeleteCourseAction(formData: FormData) {
  const courseId = text(formData, "courseId");
  await runAction({
    path: "/admin/courses",
    roles: ADMIN_ROLES,
    success: "Đã xóa khóa học thành công khỏi hệ thống.",
    task: async () => {
      const supabase = createClient();
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
      revalidatePath("/admin/courses");
      revalidatePath("/courses");
      revalidatePath("/");
      revalidatePath("/studio");
      revalidatePath("/my");
      revalidatePath("/cart");
    },
    returnTo: formData.get("returnTo"),
  });
}

// ------------------------------------------------------------------ //
// Người dùng
// ------------------------------------------------------------------ //
export async function setUserRoleAction(formData: FormData) {
  await runAction({
    path: "/admin/users",
    roles: ADMIN_ROLES,
    success: "Đã cập nhật vai trò.",
    task: () => setRole(text(formData, "userId"), text(formData, "role") as UserRole),
    returnTo: formData.get("returnTo"),
  });
}

export async function toggleBanAction(formData: FormData) {
  await runAction({
    path: "/admin/users",
    roles: ADMIN_ROLES,
    success: (banned) => (banned ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản."),
    task: () => toggleBan(text(formData, "userId"), text(formData, "reason") || undefined),
    returnTo: formData.get("returnTo"),
  });
}

export async function reviewStudentDisciplineAction(formData: FormData) {
  const approve = text(formData, "approve") === "true";
  await runAction({
    path: "/admin/student-discipline",
    roles: ADMIN_ROLES,
    success: approve ? "Đã phê duyệt xử lý học viên." : "Đã từ chối đề xuất xử lý.",
    task: async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("fn_review_student_discipline", { p_request: text(formData, "requestId"), p_approve: approve, p_review_reason: text(formData, "reviewReason") || null });
      if (error) throw error;
    },
    returnTo: formData.get("returnTo"),
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tạo tài khoản mới (dùng service role để tạo auth user). Quyền được kiểm ở đây
// VÀ ở DB (fn_set_role khi gán vai trò admin/super_admin).
export async function createUserAction(formData: FormData) {
  await runAction({
    path: "/admin/users",
    roles: ADMIN_ROLES,
    success: "Đã tạo tài khoản mới.",
    task: async () => {
      const me = await getMyProfile();
      const email = text(formData, "email").toLowerCase();
      const password = String(formData.get("password") ?? "");
      const fullName = text(formData, "fullName");
      const role = (text(formData, "role") || "student") as UserRole;

      if (!EMAIL_RE.test(email)) throw new Error("Email không hợp lệ.");
      if (password.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự.");
      if (!fullName) throw new Error("Vui lòng nhập họ tên.");
      // Chỉ super admin được tạo thẳng tài khoản quản trị.
      if (isAdminRole(role) && me?.role !== "super_admin") {
        throw new Error("Chỉ super admin mới được tạo tài khoản quản trị.");
      }

      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) {
        throw new Error(/already|exist|registered/i.test(error.message) ? "Email này đã được đăng ký." : error.message);
      }

      // Trigger DB tạo profile mặc định role=student. Gán vai trò khác qua
      // fn_set_role (chạy dưới quyền người đăng nhập → DB kiểm quyền lại).
      if (role !== "student" && data.user) {
        await setRole(data.user.id, role);
      }
    },
    returnTo: formData.get("returnTo"),
  });
}

// Xóa tài khoản (service role → xóa auth user, profile cascade theo FK 0001).
export async function deleteUserAction(formData: FormData) {
  await runAction({
    path: "/admin/users",
    roles: ADMIN_ROLES,
    success: "Đã xóa tài khoản.",
    task: async () => {
      const me = await getMyProfile();
      const userId = text(formData, "userId");
      if (!userId) throw new Error("Thiếu thông tin tài khoản.");
      if (userId === me?.id) throw new Error("Không thể tự xóa chính mình.");

      // Lấy vai trò hiện tại của tài khoản bị xóa để áp luật quyền.
      const supabase = createClient();
      const { data: target, error: readError } = await supabase.from("profiles").select("role").eq("id", userId).single();
      if (readError || !target) throw new Error("Không tìm thấy tài khoản.");
      const targetRole = target.role as UserRole;
      if (targetRole === "super_admin") throw new Error("Không thể xóa super admin — hãy hạ quyền trước.");
      if (isAdminRole(targetRole) && me?.role !== "super_admin") {
        throw new Error("Chỉ super admin mới được xóa tài khoản quản trị.");
      }

      const admin = createAdminClient();
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
    returnTo: formData.get("returnTo"),
  });
}

// Sửa họ tên (ghi profiles qua RLS profiles_update_admin — DB kiểm quyền).
export async function updateUserNameAction(formData: FormData) {
  await runAction({
    path: "/admin/users",
    roles: ADMIN_ROLES,
    success: "Đã cập nhật họ tên.",
    task: async () => {
      const userId = text(formData, "userId");
      const fullName = text(formData, "fullName");
      if (!fullName) throw new Error("Họ tên không được để trống.");
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);
      if (error) throw new Error(error.message);
    },
    returnTo: formData.get("returnTo"),
  });
}

// ------------------------------------------------------------------ //
// Duyệt video bài giảng (rpc fn_review_lesson_video — DB kiểm quyền admin)
// ------------------------------------------------------------------ //
export async function reviewVideoAction(formData: FormData) {
  const approve = text(formData, "approve") === "true";
  await runAction({
    path: "/admin/courses",
    roles: ADMIN_ROLES,
    success: approve ? "Đã duyệt video." : "Đã từ chối video và gửi feedback cho giảng viên.",
    task: async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("fn_review_lesson_video", {
        p_lesson: text(formData, "lessonId"),
        p_approve: approve,
        p_reason: text(formData, "reason") || null,
      });
      if (error) throw error;
      revalidatePath("/admin/courses");
      revalidatePath("/courses");
      revalidatePath("/admin/video-reviews");
    },
    returnTo: formData.get("returnTo"),
  });
}

// ------------------------------------------------------------------ //
// Duyệt nội dung bài giảng (rpc fn_review_lesson_content — DB kiểm quyền admin)
// ------------------------------------------------------------------ //
export async function reviewLessonContentAction(formData: FormData) {
  const approve = text(formData, "approve") === "true";
  await runAction({
    path: "/admin/courses",
    roles: ADMIN_ROLES,
    success: approve ? "Đã duyệt cập nhật bài giảng." : "Đã từ chối cập nhật và gửi feedback cho giảng viên.",
    task: async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("fn_review_lesson_content", {
        p_lesson: text(formData, "lessonId"),
        p_approve: approve,
        p_reason: text(formData, "reason") || null,
      });
      if (error) throw error;
      revalidatePath("/admin/courses");
      revalidatePath("/courses");
    },
    returnTo: formData.get("returnTo"),
  });
}

// ------------------------------------------------------------------ //
// Danh mục & tag (ghi thẳng bảng qua RLS categories_admin_all / tag_admin_all)
// ------------------------------------------------------------------ //
type TaxonomyTable = "categories" | "tag";
const taxonomyTable = (formData: FormData): TaxonomyTable => (text(formData, "kind") === "tag" ? "tag" : "categories");
const taxonomyLabel = (table: TaxonomyTable) => (table === "tag" ? "tag" : "danh mục");

// Lỗi trùng slug (unique) → thông báo dễ hiểu.
function friendlyDbError(error: { code?: string; message: string }): Error {
  return new Error(error.code === "23505" ? "Slug đã tồn tại, hãy đặt tên/slug khác." : error.message);
}

export async function saveTaxonomyAction(formData: FormData) {
  const table = taxonomyTable(formData);
  const id = text(formData, "id");
  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug") || name);
  await runAction({
    path: "/admin/categories",
    roles: ADMIN_ROLES,
    success: `Đã lưu ${taxonomyLabel(table)} "${name}".`,
    task: async () => {
      if (!name) throw new Error("Tên không được để trống.");
      if (!slug) throw new Error("Không tạo được slug từ tên này, hãy nhập slug.");
      const supabase = createClient();
      const { error } = id
        ? await supabase.from(table).update({ name, slug }).eq("id", id)
        : await supabase.from(table).insert({ name, slug });
      if (error) throw friendlyDbError(error);
    },
  });
}

export async function deleteTaxonomyAction(formData: FormData) {
  const table = taxonomyTable(formData);
  await runAction({
    path: "/admin/categories",
    roles: ADMIN_ROLES,
    success: `Đã xóa ${taxonomyLabel(table)}.`,
    task: async () => {
      const supabase = createClient();
      // courses.category_id → set null; course_tag → cascade (theo 0002).
      const { error } = await supabase.from(table).delete().eq("id", text(formData, "id"));
      if (error) throw friendlyDbError(error);
    },
  });
}

// ------------------------------------------------------------------ //
// Báo cáo & review
// ------------------------------------------------------------------ //
export async function resolveReportAction(formData: FormData) {
  const status = text(formData, "status") as ReportStatus;
  await runAction({
    path: "/admin/reports",
    roles: ADMIN_ROLES,
    success: status === "resolved" ? "Đã đánh dấu báo cáo là đã xử lý." : "Đã bỏ qua báo cáo.",
    task: () => resolveReport(text(formData, "id"), status),
    returnTo: formData.get("returnTo"),
  });
}

export async function moderateReviewAction(formData: FormData) {
  const status = text(formData, "status") as ReviewStatus;
  await runAction({
    path: "/admin/reports",
    roles: ADMIN_ROLES,
    success: status === "visible" ? "Đã hiển thị review." : "Đã ẩn review.",
    task: () => moderateReview(text(formData, "id"), status),
    returnTo: formData.get("returnTo"),
  });
}

// ------------------------------------------------------------------ //
// Thông báo hệ thống
// ------------------------------------------------------------------ //
export async function broadcastAction(formData: FormData) {
  const target = text(formData, "target"); // all | student | instructor | course
  await runAction({
    path: "/admin/notifications",
    roles: ADMIN_ROLES,
    success: (count) => `Đã gửi thông báo tới ${count} người.`,
    task: async () => {
      const courseId = text(formData, "courseId");
      if (target === "course" && !courseId) throw new Error("Hãy chọn khóa học.");
      return broadcastNotification({
        title: text(formData, "title"),
        body: text(formData, "body") || undefined,
        role: target === "student" || target === "instructor" ? target : undefined,
        courseId: target === "course" ? courseId : undefined,
      });
    },
  });
}

// ------------------------------------------------------------------ //
// Mã giảm giá (ghi qua RLS coupon_admin_all)
// ------------------------------------------------------------------ //
export async function createCouponAction(formData: FormData) {
  await runAction({
    path: "/admin/coupons",
    roles: ADMIN_ROLES,
    success: "Đã tạo mã giảm giá.",
    task: async () => {
      const code = text(formData, "code").toUpperCase();
      const type = text(formData, "type");
      const value = Number(formData.get("value"));
      const validFrom = text(formData, "validFrom");
      const validTo = text(formData, "validTo");
      const usageLimit = text(formData, "usageLimit");

      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error("Mã gồm 3–32 ký tự chữ, số, '-' hoặc '_'.");
      if (type !== "percent" && type !== "fixed") throw new Error("Loại giảm giá không hợp lệ.");
      if (!(value > 0) || (type === "percent" && value > 100)) throw new Error("Giá trị phải > 0 (phần trăm tối đa 100).");
      if (validTo && validFrom && validTo < validFrom) throw new Error("Ngày kết thúc phải sau ngày bắt đầu.");

      const supabase = createClient();
      const { error } = await supabase.from("coupon").insert({
        code,
        type,
        value,
        valid_from: validFrom ? new Date(validFrom).toISOString() : new Date().toISOString(),
        // Hết hạn vào cuối ngày kết thúc.
        valid_to: validTo ? new Date(`${validTo}T23:59:59`).toISOString() : null,
        usage_limit: usageLimit ? Number(usageLimit) : null,
      });
      if (error) throw error.code === "23505" ? new Error(`Mã "${code}" đã tồn tại.`) : error;
    },
  });
}

export async function disableCouponAction(formData: FormData) {
  await runAction({
    path: "/admin/coupons",
    roles: ADMIN_ROLES,
    success: "Đã vô hiệu hóa mã giảm giá.",
    task: async () => {
      const supabase = createClient();
      const id = text(formData, "id");
      const { data: coupon, error: readError } = await supabase.from("coupon").select("valid_from").eq("id", id).single();
      if (readError) throw readError;
      // Kết thúc ngay; mã chưa bắt đầu thì kéo ngày bắt đầu về hiện tại để khoảng hiệu lực không bị ngược.
      const now = new Date().toISOString();
      const update = new Date(String(coupon.valid_from)) > new Date(now) ? { valid_from: now, valid_to: now } : { valid_to: now };
      const { error } = await supabase.from("coupon").update(update).eq("id", id);
      if (error) throw error;
    },
  });
}

// ------------------------------------------------------------------ //
// Hỏi đáp (Q&A) — xóa nội dung vi phạm (lý do bắt buộc, báo người viết)
// ------------------------------------------------------------------ //
export async function deleteQaAction(formData: FormData) {
  const entity = text(formData, "entity") === "answer" ? "answer" : "question";
  await runAction({
    path: "/admin/qa",
    roles: ADMIN_ROLES,
    success: entity === "answer" ? "Đã gỡ câu trả lời." : "Đã gỡ câu hỏi (kèm các câu trả lời).",
    task: () => moderateQa(entity, text(formData, "id"), text(formData, "reason")),
    returnTo: formData.get("returnTo"),
  });
}

// ------------------------------------------------------------------ //
// Chứng chỉ — thu hồi / khôi phục
// ------------------------------------------------------------------ //
export async function revokeCertificateAction(formData: FormData) {
  await runAction({
    path: "/admin/certificates",
    roles: ADMIN_ROLES,
    success: "Đã thu hồi chứng chỉ và báo cho học viên.",
    task: () => revokeCertificate(text(formData, "id"), text(formData, "reason"), true),
    returnTo: formData.get("returnTo"),
  });
}

export async function restoreCertificateAction(formData: FormData) {
  await runAction({
    path: "/admin/certificates",
    roles: ADMIN_ROLES,
    success: "Đã khôi phục chứng chỉ.",
    task: () => revokeCertificate(text(formData, "id"), null, false),
    returnTo: formData.get("returnTo"),
  });
}
