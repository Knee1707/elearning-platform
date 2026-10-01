import {
  Award,
  Banknote,
  Bell,
  BookCheck,
  CreditCard,
  Flag,
  FolderTree,
  LayoutDashboard,
  MessagesSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Tag,
  Undo2,
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

export const NAV_GROUPS: Record<AdminArea, NavGroup[]> = {
  admin: [
    { title: "Tổng quan", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
    {
      title: "Kiểm duyệt",
      items: [
        { href: "/admin/courses", label: "Duyệt khóa học", icon: BookCheck },
        { href: "/admin/reports", label: "Báo cáo & review", icon: Flag },
        { href: "/admin/qa", label: "Hỏi đáp (Q&A)", icon: MessagesSquare },
      ],
    },
    {
      title: "Người dùng & nội dung",
      items: [
        { href: "/admin/users", label: "Người dùng", icon: Users },
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
  ],
  super_admin: [
    { title: "Tổng quan", items: [{ href: "/super-admin", label: "Dashboard hệ thống", icon: LayoutDashboard }] },
    { title: "Nhân sự", items: [{ href: "/super-admin/admins", label: "Quản lý Admin", icon: ShieldCheck }] },
    {
      title: "Tài chính",
      items: [
        { href: "/super-admin/refunds", label: "Hoàn tiền", icon: Undo2 },
        { href: "/super-admin/payouts", label: "Payout giảng viên", icon: Banknote },
      ],
    },
    {
      title: "Hệ thống",
      items: [
        { href: "/super-admin/settings", label: "Cấu hình", icon: Settings },
        { href: "/super-admin/audit-log", label: "Nhật ký hoạt động", icon: ScrollText },
      ],
    },
  ],
};
