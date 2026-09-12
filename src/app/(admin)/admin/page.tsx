import { getAdminDashboard } from "@/lib/queries/admin";

// Route: /admin · Chủ: M4 (UI) · dữ liệu từ view_admin_dashboard (L). Cần đăng nhập admin.
// Ví dụ mẫu: đọc dashboard qua query của L. M4 dựng bảng/thẻ số liệu đầy đủ.
export default async function AdminPage() {
  let dashboard = null;
  try {
    dashboard = await getAdminDashboard();
  } catch {
    dashboard = null;
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Quản trị · Dashboard</h1>
      {dashboard ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
          ["Tổng người dùng", dashboard.totalUsers], ["Giảng viên", dashboard.totalInstructors],
          ["Khóa đã xuất bản", dashboard.publishedCourses], ["Khóa chờ duyệt", dashboard.pendingCourses],
          ["Ghi danh hoạt động", dashboard.activeEnrollments], ["Tổng doanh thu", new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(dashboard.totalRevenue)],
        ].map(([label, value]) => <section key={String(label)} className="rounded-lg border p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></section>)}</div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Chưa có dữ liệu. Hãy đăng nhập bằng tài khoản quản trị và kiểm tra migrations.
        </p>
      )}
    </main>
  );
}
