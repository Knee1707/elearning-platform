import { Search } from "lucide-react";
import { getMyProfile } from "@/lib/queries/auth";
import { ROLE_LABELS } from "@/lib/utils";
import type { UserRole } from "@/types/domain";
import { getAdminTeam, searchGrantCandidates } from "@/features/super-admin/queries";
import { setUserRoleAction, toggleBanAction } from "@/features/super-admin/actions";
import { FlashMessage, PageHeader, RoleBadge, dateTime, param, type SearchParams } from "@/features/super-admin/ui";

const ALL_ROLES: UserRole[] = ["super_admin", "admin", "instructor", "student"];

export default async function SuperAdminTeamPage({ searchParams }: { searchParams: SearchParams }) {
  const keyword = param(searchParams, "q") ?? "";
  const [me, team, candidates] = await Promise.all([getMyProfile(), getAdminTeam(), searchGrantCandidates(keyword)]);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader
        title="Quản lý Admin"
        description="Cấp, đổi hoặc thu hồi quyền quản trị. Hệ thống luôn giữ ít nhất 1 super admin; super admin phải hạ quyền trước khi khóa."
      />
      <FlashMessage searchParams={searchParams} />

      <section className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="p-3">Thành viên</th>
              <th className="p-3">Vai trò</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Đổi vai trò</th>
              <th className="p-3">Khóa</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => {
              const isSelf = member.id === me?.id;
              return (
                <tr key={member.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <p className="font-medium">
                      {member.fullName || "Chưa đặt tên"}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(bạn)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">Từ {dateTime.format(new Date(member.createdAt))}</p>
                  </td>
                  <td className="p-3"><RoleBadge role={member.role} /></td>
                  <td className="p-3">{member.isBanned ? <span className="text-red-600 dark:text-red-400">Đã khóa</span> : "Hoạt động"}</td>
                  <td className="p-3">
                    {isSelf ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <form action={setUserRoleAction} className="flex gap-2">
                        <input type="hidden" name="userId" value={member.id} />
                        <select name="role" defaultValue={member.role} aria-label="Vai trò mới" className="rounded border border-border bg-background px-2 py-1">
                          {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                        <button type="submit" className="underline">Lưu</button>
                      </form>
                    )}
                  </td>
                  <td className="p-3">
                    {isSelf || member.role === "super_admin" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <form action={toggleBanAction}>
                        <input type="hidden" name="userId" value={member.id} />
                        <button type="submit" className="underline">{member.isBanned ? "Mở khóa" : "Khóa"}</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-8 rounded-lg border border-border p-5">
        <h2 className="font-semibold">Cấp quyền Admin</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tìm học viên hoặc giảng viên theo tên.</p>
        <form className="mt-4 flex max-w-md gap-2" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={keyword}
              placeholder="Nhập tên người dùng…"
              aria-label="Tên người dùng"
              className="w-full rounded border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Tìm</button>
        </form>

        {keyword && (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {candidates.length ? (
              candidates.map((user) => (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{user.fullName || "Chưa đặt tên"}</span>
                    <RoleBadge role={user.role} />
                    {user.isBanned && <span className="text-xs text-red-600 dark:text-red-400">Đã khóa</span>}
                  </span>
                  <form action={setUserRoleAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="role" value="admin" />
                    <button type="submit" className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted">Cấp quyền Admin</button>
                  </form>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-muted-foreground">Không tìm thấy học viên/giảng viên nào khớp “{keyword}”.</li>
            )}
          </ul>
        )}
      </section>
    </main>
  );
}
