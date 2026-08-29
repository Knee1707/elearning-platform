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
        <pre className="mt-4 rounded-lg border bg-muted p-4 text-sm">
          {JSON.stringify(dashboard, null, 2)}
        </pre>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Chưa có dữ liệu (cần đăng nhập admin + đã chạy migration). TODO(M4): dựng UI đầy đủ.
        </p>
      )}
    </main>
  );
}
