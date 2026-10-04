import Link from "next/link";
import { Search } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES, ROLE_LABELS, isAdminRole } from "@/lib/utils";
import type { UserRole } from "@/types/domain";
import { ADMIN_PAGE_SIZE, getUsers } from "@/features/admin/queries";
import { deleteUserAction, setUserRoleAction, toggleBanAction } from "@/features/admin/actions";
import { ConfirmAction, FlashMessage, PageHeader, Pagination, ReasonAction, RoleBadge, buildHref, dateTime, param, type SearchParams } from "@/features/admin/ui";

const ROLE_FILTERS: UserRole[] = ["student", "instructor", "admin", "super_admin"];

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireRole(ADMIN_ROLES);
  const isSuperAdmin = me.role === "super_admin";
  // Admin thường chỉ gán student/instructor; super admin gán được mọi vai trò (DB kiểm lại).
  const assignableRoles: UserRole[] = isSuperAdmin ? ["student", "instructor", "admin", "super_admin"] : ["student", "instructor"];

  const keyword = param(searchParams, "q") ?? "";
  const roleParam = param(searchParams, "role");
  const role = ROLE_FILTERS.find((r) => r === roleParam);
  const statusParam = param(searchParams, "status");
  const banned = statusParam === "banned" ? true : statusParam === "active" ? false : undefined;
  const page = Math.max(1, Number(param(searchParams, "page")) || 1);

  const { users, total } = await getUsers({ keyword, role, banned, page });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const filters = { q: keyword, role, status: statusParam };
  const here = buildHref("/admin/users", { ...filters, page });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader
        title="Người dùng"
        description={`Sửa, xóa; đổi vai trò hoặc khóa tài khoản (bắt buộc ghi lý do).${isSuperAdmin ? "" : " Tài khoản quản trị chỉ super admin mới thay đổi được."}`}
      />
      <FlashMessage searchParams={searchParams} />

      <form key={`${keyword}|${role ?? ""}|${statusParam ?? ""}`} className="mt-6 flex flex-wrap items-end gap-3" role="search">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Tên</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={keyword} placeholder="Tìm theo tên…" className="w-56 rounded border border-border bg-background py-2 pl-9 pr-3" />
          </span>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Vai trò</span>
          <select name="role" defaultValue={role ?? ""} className="rounded border border-border bg-background px-3 py-2">
            <option value="">Tất cả</option>
            {ROLE_FILTERS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Trạng thái</span>
          <select name="status" defaultValue={statusParam ?? ""} className="rounded border border-border bg-background px-3 py-2">
            <option value="">Tất cả</option>
            <option value="active">Hoạt động</option>
            <option value="banned">Đã khóa</option>
          </select>
        </label>
        <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Lọc</button>
        {/* Dùng <a> (tải lại trang) thay vì <Link> để tránh cache router giữ kết quả/giá trị lọc cũ. */}
        {(keyword || role || statusParam) && <a href="/admin/users" className="px-2 py-2 text-sm underline">Bỏ lọc</a>}
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr><th className="p-3">Người dùng</th><th className="p-3">Vai trò</th><th className="p-3">Trạng thái</th><th className="p-3">Đổi vai trò</th><th className="p-3">Khóa</th><th className="p-3">Xóa</th></tr>
          </thead>
          <tbody>
            {users.length ? (
              users.map((user) => {
                const isSelf = user.id === me.id;
                const canManage = !isSelf && (isSuperAdmin || !isAdminRole(user.role));
                // Super admin không bị khóa trực tiếp (phải hạ quyền trước) — khớp fn_toggle_ban.
                const canBan = canManage && user.role !== "super_admin";
                return (
                  <tr key={user.id} className="border-b border-border align-top last:border-0">
                    <td className="p-3">
                      <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
                        {user.fullName || "Chưa đặt tên"}
                      </Link>
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(bạn)</span>}
                      <p className="text-xs text-muted-foreground">Tham gia {dateTime.format(new Date(user.createdAt))}</p>
                    </td>
                    <td className="p-3"><RoleBadge role={user.role} /></td>
                    <td className="p-3">{user.isBanned ? <span className="text-red-600 dark:text-red-400">Đã khóa</span> : "Hoạt động"}</td>
                    <td className="p-3">
                      {canManage ? (
                        <form action={setUserRoleAction} className="flex gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="returnTo" value={here} />
                          <select name="role" defaultValue={user.role} aria-label="Vai trò mới" className="rounded border border-border bg-background px-2 py-1">
                            {assignableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                          <button className="underline" type="submit">Lưu</button>
                        </form>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {!canBan ? (
                        <span className="text-muted-foreground">—</span>
                      ) : user.isBanned ? (
                        <form action={toggleBanAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="returnTo" value={here} />
                          <button className="underline" type="submit">Mở khóa</button>
                        </form>
                      ) : (
                        <ReasonAction action={toggleBanAction} label="Khóa" submitLabel="Xác nhận khóa" hidden={{ userId: user.id, returnTo: here }} />
                      )}
                    </td>
                    <td className="p-3">
                      {canBan ? (
                        <ConfirmAction
                          action={deleteUserAction}
                          label="Xóa"
                          message={`Xóa vĩnh viễn tài khoản "${user.fullName || "Chưa đặt tên"}"? Không thể hoàn tác.`}
                          submitLabel="Xác nhận xóa"
                          hidden={{ userId: user.id, returnTo: here }}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">Không tìm thấy người dùng nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => buildHref("/admin/users", { ...filters, page: p })} />
    </main>
  );
}
