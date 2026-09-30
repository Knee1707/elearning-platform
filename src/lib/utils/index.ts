import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UserRole } from "@/types/domain";

// Gộp class Tailwind (dùng bởi shadcn/ui).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Định dạng tiền VND.
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Định dạng ngày kiểu Việt.
export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export const APP_NAME = "LMS Đào tạo";

// Vai trò có quyền vào trang quản trị (khớp fn_is_admin() ở DB).
export const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Học viên",
  instructor: "Giảng viên",
  admin: "Quản trị viên",
  super_admin: "Quản trị cấp cao",
};
