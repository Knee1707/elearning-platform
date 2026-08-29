import Link from "next/link";

// Trang chủ công khai (skeleton). M3 sẽ dựng nội dung khám phá khóa học.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">LMS Đào tạo</h1>
        <p className="text-muted-foreground">
          Bộ khung dự án đã sẵn sàng. Mỗi thành viên điền thân theo cây MECE trong{" "}
          <code className="rounded bg-muted px-1 py-0.5">PHAN_CONG.md</code>.
        </p>
      </div>

      <nav className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NavCard href="/courses" title="Khóa học" owner="M3" />
        <NavCard href="/my" title="Học của tôi" owner="M3" />
        <NavCard href="/studio" title="Giảng viên" owner="M4" />
        <NavCard href="/admin" title="Quản trị" owner="M4" />
        <NavCard href="/login" title="Đăng nhập" owner="M4" />
        <NavCard href="/register" title="Đăng ký" owner="M4" />
      </nav>
    </main>
  );
}

function NavCard({ href, title, owner }: { href: string; title: string; owner: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">chủ: {owner}</span>
    </Link>
  );
}
