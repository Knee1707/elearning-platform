import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES, ROLE_LABELS, isAdminRole } from "@/lib/utils";
import type { UserRole } from "@/types/domain";
import { getUserDetail } from "@/features/admin/queries";
import { getActivityLog } from "@/features/super-admin/queries";
import { deleteUserAction, setUserRoleAction, toggleBanAction, updateUserNameAction } from "@/features/admin/actions";
import { ConfirmAction, FlashMessage, ReasonAction, RoleBadge, dateTime, describeActivity, money, type SearchParams } from "@/features/admin/ui";

const PAYMENT_LABEL = { paid: "Đã thanh toán", pending: "Chờ thanh toán", refunded: "Đã hoàn tiền" } as const;
const REPORT_LABEL = { open: "Đang mở", resolved: "Đã xử lý", dismissed: "Bỏ qua" } as const;
const COURSE_LABEL = { draft: "Nháp", pending: "Chờ duyệt", published: "Đang bán", rejected: "Bị từ chối", hidden: "Đã ẩn" } as const;

export default async function AdminUserDetailPage({ params, searchParams }: { params: { userId: string }; searchParams: SearchParams }) {
  const me = await requireRole(ADMIN_ROLES);
  const [detail, activity] = await Promise.all([
    getUserDetail(params.userId),
    getActivityLog({ entity: "user", entityId: params.userId, pageSize: 20 }),
  ]);
  if (!detail) notFound();

  const { user, enrollments, payments, taughtCourses, reports } = detail;
  const isSuperAdmin = me.role === "super_admin";
  const isSelf = user.id === me.id;
  const canManage = !isSelf && (isSuperAdmin || !isAdminRole(user.role));
  const canBan = canManage && user.role !== "super_admin";
  const assignableRoles: UserRole[] = isSuperAdmin ? ["student", "instructor", "admin", "super_admin"] : ["student", "instructor"];
  const here = `/admin/users/${user.id}`;
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách người dùng
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{user.fullName || "Chưa đặt tên"}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <RoleBadge role={user.role} />
            {user.isBanned ? <span className="font-medium text-red-600 dark:text-red-400">Đã khóa</span> : <span>Hoạt động</span>}
            <span>· Tham gia {dateTime.format(new Date(user.createdAt))}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          {canManage && (
            <form action={setUserRoleAction} className="flex gap-2">
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="returnTo" value={here} />
              <select name="role" defaultValue={user.role} aria-label="Vai trò mới" className="rounded border border-border bg-background px-2 py-2 text-sm">
                {assignableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <button type="submit" className="rounded border border-border px-3 py-2 text-sm hover:bg-muted">Đổi vai trò</button>
            </form>
          )}
          {canBan &&
            (user.isBanned ? (
              <form action={toggleBanAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="returnTo" value={here} />
                <button type="submit" className="rounded border border-border px-3 py-2 text-sm hover:bg-muted">Mở khóa</button>
              </form>
            ) : (
              <ReasonAction action={toggleBanAction} label="Khóa tài khoản" submitLabel="Xác nhận khóa" hidden={{ userId: user.id, returnTo: here }} />
            ))}
          {canBan && (
            <ConfirmAction
              action={deleteUserAction}
              label="Xóa tài khoản"
              message={`Xóa vĩnh viễn "${user.fullName || "Chưa đặt tên"}"? Mọi dữ liệu liên quan sẽ bị xóa và không thể hoàn tác.`}
              submitLabel="Xác nhận xóa"
              hidden={{ userId: user.id, returnTo: "/admin/users" }}
            />
          )}
        </div>
      </div>

      {canManage && (
        <form action={updateUserNameAction} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Sửa họ tên</span>
            <input name="fullName" defaultValue={user.fullName} required className="w-64 rounded border border-border bg-background px-2 py-2 text-sm" />
          </label>
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="returnTo" value={here} />
          <button type="submit" className="rounded border border-border px-3 py-2 text-sm hover:bg-muted">Lưu tên</button>
        </form>
      )}
      <FlashMessage searchParams={searchParams} />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Khóa đã ghi danh" value={enrollments.length} />
        <Stat label="Tổng đã thanh toán" value={money.format(totalPaid)} />
        <Stat label="Bị báo cáo" value={reports.length} />
      </div>

      {taughtCourses.length > 0 && (
        <Section title={`Khóa học giảng dạy (${taughtCourses.length})`}>
          {taughtCourses.map((c) => (
            <Row key={c.id} left={<Link href={`/admin/courses/${c.id}`} className="hover:underline">{c.title}</Link>} right={`${COURSE_LABEL[c.status]} · ${money.format(c.price)}`} />
          ))}
        </Section>
      )}

      <Section title={`Ghi danh (${enrollments.length})`} empty="Chưa ghi danh khóa nào.">
        {enrollments.map((e) => (
          <Row key={e.id} left={e.courseTitle ?? "Khóa học"} right={`${e.status === "active" ? "Đang học" : "Đã hoàn tiền"} · ${dateTime.format(new Date(e.purchasedAt))}`} />
        ))}
      </Section>

      <Section title={`Giao dịch (${payments.length})`} empty="Chưa có giao dịch.">
        {payments.map((p) => (
          <Row key={p.id} left={p.courseTitle ?? "Khóa học"} right={`${money.format(p.amount)} · ${PAYMENT_LABEL[p.status]} · ${dateTime.format(new Date(p.createdAt))}`} />
        ))}
      </Section>

      <Section title={`Báo cáo về người dùng này (${reports.length})`} empty="Không có báo cáo.">
        {reports.map((r) => (
          <Row key={r.id} left={r.reason || "(không ghi lý do)"} right={`${REPORT_LABEL[r.status]} · ${dateTime.format(new Date(r.createdAt))}`} />
        ))}
      </Section>

      <Section title="Lịch sử quản trị" empty="Chưa có thao tác quản trị nào với tài khoản này.">
        {activity.entries.map((entry) => {
          const { label, detail: info } = describeActivity(entry);
          return (
            <Row
              key={entry.id}
              left={`${label}${info ? ` · ${info}` : ""}${entry.reason ? ` · Lý do: ${entry.reason}` : ""}`}
              right={`${entry.actorName ?? "Hệ thống"} · ${dateTime.format(new Date(entry.createdAt))}`}
            />
          );
        })}
      </Section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <section className="rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </section>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <section className="mt-8">
      <h2 className="font-semibold">{title}</h2>
      {items.length ? (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border text-sm">{children}</ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: string }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
      <span className="min-w-0">{left}</span>
      <span className="text-xs text-muted-foreground">{right}</span>
    </li>
  );
}
