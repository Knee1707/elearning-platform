import { cookies } from "next/headers";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES, ROLE_LABELS } from "@/lib/utils";
import { AdminThemeProvider } from "@/features/admin/theme/AdminThemeProvider";
import { AdminShell } from "@/features/admin/shell/AdminShell";
import { SIDEBAR_COOKIE } from "@/features/admin/shell/navItems";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(ADMIN_ROLES);

  return (
    <AdminThemeProvider>
      <AdminShell
        area="admin"
        userName={profile.fullName}
        roleLabel={ROLE_LABELS[profile.role]}
        canSwitchArea={profile.role === "super_admin"}
        initialCollapsed={cookies().get(SIDEBAR_COOKIE)?.value === "1"}
      >
        {children}
      </AdminShell>
    </AdminThemeProvider>
  );
}
