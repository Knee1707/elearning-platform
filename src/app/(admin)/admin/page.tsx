import { redirect } from "next/navigation";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";

// Admin KHÔNG còn Dashboard — vào /admin sẽ chuyển thẳng tới thao tác quản trị.
// Super admin có Dashboard riêng ở /super-admin.
export default async function AdminIndexPage() {
  const me = await requireRole(ADMIN_ROLES);
  redirect(me.role === "super_admin" ? "/super-admin" : "/admin/users");
}
