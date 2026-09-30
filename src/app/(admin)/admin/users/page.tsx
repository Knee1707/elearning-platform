import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { setRole, toggleBan } from "@/lib/queries/admin";

async function updateUser(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId"));
  const action = String(formData.get("action"));
  if (action === "role") await setRole(userId, String(formData.get("role")) as "student" | "instructor" | "admin");
  if (action === "ban") await toggleBan(userId);
  revalidatePath("/admin/users");
}

export default async function AdminUsersPage() {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { data: users } = await supabase.from("profiles").select("id, full_name, role, is_banned, created_at").order("created_at", { ascending: false });
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Người dùng</h1>
      <p className="mt-2 text-sm text-muted-foreground">Cập nhật vai trò hoặc khóa tài khoản khi cần.</p>
      <div className="mt-6 overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Người dùng</th><th className="p-3">Vai trò</th><th className="p-3">Ngày tạo</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr></thead><tbody>{users?.map((user) => <tr key={String(user.id)} className="border-b last:border-0"><td className="p-3">{String(user.full_name || "Chưa đặt tên")}</td><td className="p-3"><form action={updateUser} className="flex gap-2"><input type="hidden" name="userId" value={String(user.id)} /><input type="hidden" name="action" value="role" /><select name="role" defaultValue={String(user.role)} className="rounded border bg-background px-2 py-1"><option value="student">Học viên</option><option value="instructor">Giảng viên</option><option value="admin">Quản trị</option></select><button className="underline" type="submit">Lưu</button></form></td><td className="p-3">{new Date(String(user.created_at)).toLocaleDateString("vi-VN")}</td><td className="p-3">{user.is_banned ? "Đã khóa" : "Hoạt động"}</td><td className="p-3"><form action={updateUser}><input type="hidden" name="userId" value={String(user.id)} /><input type="hidden" name="action" value="ban" /><button className="underline" type="submit">{user.is_banned ? "Mở khóa" : "Khóa"}</button></form></td></tr>)}</tbody></table></div>
    </main>
  );
}
