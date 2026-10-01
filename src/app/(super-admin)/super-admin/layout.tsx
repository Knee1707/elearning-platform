import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/auth";
import { isAdminRole, ROLE_LABELS } from "@/lib/utils";
import { AdminThemeProvider } from "@/features/admin/theme/AdminThemeProvider";
import { AdminShell } from "@/features/admin/shell/AdminShell";
import { SIDEBAR_COOKIE } from "@/features/admin/shell/navItems";

// Khu Super Admin tách riêng khỏi /admin. Quyền thật được DB kiểm lại
// (fn_is_super_admin) ở mọi hàm/policy — layout chỉ điều hướng cho đúng chỗ.
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login?next=/super-admin");
  if (profile.role !== "super_admin" || profile.isBanned) {
    redirect(isAdminRole(profile.role) && !profile.isBanned ? "/admin" : "/");
  }

  return (
    <AdminThemeProvider>
      <AdminShell
        area="super_admin"
        userName={profile.fullName}
        roleLabel={ROLE_LABELS[profile.role]}
        canSwitchArea
        initialCollapsed={cookies().get(SIDEBAR_COOKIE)?.value === "1"}
      >
        {children}
      </AdminShell>
    </AdminThemeProvider>
  );
}
