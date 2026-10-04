import {
  Award,
  Bell,
  BookCheck,
  CreditCard,
  Flag,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  Video,
  ScrollText,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";

// Hai khu quản trị dùng chung 1 khung (AdminShell) nhưng menu riêng.
export type AdminArea = "admin" | "super_admin";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Cookie lưu trạng thái thu gọn sidebar (desktop) — đọc ở server để không nháy khi tải trang.
export const SIDEBAR_COOKIE = "admin_sidebar_collapsed";

export const AREA_HOME: Record<AdminArea, string> = {
  admin: "/admin",
  super_admin: "/super-admin",
};

// Nhóm thao tác quản trị (admin + super admin đều dùng). Admin KHÔNG có Dashboard.
const MODERATION_GROUPS: NavGroup[] = [
  {
    title: "Kiểm duyệt",
    items: [
      { href: "/admin/courses", label: "Duyệt khóa học", icon: BookCheck },
      { href: "/admin/reports", label: "Báo cáo & review", icon: Flag },
    ],
  },
  {
    title: "Người dùng & nội dung",
    items: [
      { href: "/admin/users", label: "Người dùng", icon: Users },
      { href: "/admin/students", label: "Quản lý học viên", icon: GraduationCap },
      { href: "/admin/categories", label: "Danh mục & tag", icon: FolderTree },
      { href: "/admin/certificates", label: "Chứng chỉ", icon: Award },
    ],
  },
  {
    title: "Kinh doanh",
    items: [
      { href: "/admin/payments", label: "Giao dịch", icon: CreditCard },
      { href: "/admin/coupons", label: "Mã giảm giá", icon: Tag },
    ],
  },
  { title: "Truyền thông", items: [{ href: "/admin/notifications", label: "Gửi thông báo", icon: Bell }] },
];

// Nhóm riêng của super admin (nhân sự, hệ thống).
const SUPER_ONLY_GROUPS: NavGroup[] = [
  { title: "Nhân sự", items: [{ href: "/super-admin/admins", label: "Quản lý Admin", icon: ShieldCheck }] },
  {
    title: "Hệ thống",
    items: [
      { href: "/super-admin/settings", label: "Cấu hình", icon: Settings },
      { href: "/super-admin/audit-log", label: "Nhật ký hoạt động", icon: ScrollText },
    ],
  },
];

export const NAV_GROUPS: Record<AdminArea, NavGroup[]> = {
  // Admin: CHỈ các thao tác quản trị, không có Dashboard.
  admin: MODERATION_GROUPS,
  // Super admin: 1 menu duy nhất — Dashboard + mọi thao tác admin + nhóm super admin.
  // Không phải chuyển "khu" nữa, tất cả nằm trong cùng danh mục.
  super_admin: [
    { title: "Tổng quan", items: [{ href: "/super-admin", label: "Dashboard hệ thống", icon: LayoutDashboard }] },
    ...MODERATION_GROUPS,
    ...SUPER_ONLY_GROUPS,
  ],
};
