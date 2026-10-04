import { redirect } from "next/navigation";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";

export default async function AdminQaPage() {
  await requireRole(ADMIN_ROLES);
  redirect("/admin/courses");
}
