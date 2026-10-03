// Kiểu domain dùng chung (camelCase). Tầng lib/queries map từ snake_case (DB) sang đây.
// Sau khi có schema thật, chạy `pnpm db:types` để sinh src/types/database.types.ts
// rồi ép kiểu chặt hơn nếu cần.

export type UserRole = "student" | "instructor" | "admin" | "super_admin";
export type CourseStatus = "draft" | "pending" | "published" | "rejected" | "hidden";
export type EnrollmentStatus = "active" | "pending" | "refunded" | "suspended" | "expelled";
export type PaymentStatus = "pending" | "paid" | "refunded";
export type AttendanceSource = "video" | "live";
export type CouponType = "percent" | "fixed";
export type ReviewStatus = "visible" | "hidden" | "pending";
export type RefundStatus = "pending" | "approved" | "rejected";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type PayoutStatus = "draft" | "paid";
export type NotifType = "purchase" | "reply" | "system" | "reminder";

export interface Profile {
  id: string;
  fullName: string;
  phone?: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isBanned: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  instructorId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  description: string;
  level: string;
  price: number;
  status: CourseStatus;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  moderationNote?: string | null; // Lý do từ chối/ẩn gần nhất (0014)
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  position: number;
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  videoUrl: string | null;
  videoStatus: string;
  durationSeconds: number;
  isFree: boolean;
  position: number;
}

export interface Review {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  watchedPercent: number;
  isCompleted: boolean;
  lastPositionSeconds: number;
  updatedAt: string;
}

export interface AdminDashboard {
  totalUsers: number;
  totalInstructors: number;
  publishedCourses: number;
  pendingCourses: number;
  activeEnrollments: number;
  totalRevenue: number;
}
