import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default async function PayoutPage() {
  const profile = await requireRole(["instructor", "admin"]);
  const supabase = createClient();
  const { data } = await supabase.from("view_instructor_payout").select("period, gross, platform_fee, net, status").eq("instructor_id", profile.id).order("period", { ascending: false });
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Doanh thu được nhận</h1>
      <p className="mt-2 text-sm text-muted-foreground">Tổng hợp doanh thu theo kỳ do quản trị viên tạo.</p>
      {!data?.length ? <p className="mt-6 text-sm text-muted-foreground">Chưa có kỳ thanh toán nào.</p> : <div className="mt-6 overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Kỳ</th><th className="p-3">Doanh thu</th><th className="p-3">Phí nền tảng</th><th className="p-3">Nhận được</th><th className="p-3">Trạng thái</th></tr></thead><tbody>{data.map((item) => <tr key={String(item.period)} className="border-b last:border-0"><td className="p-3">{String(item.period)}</td><td className="p-3">{money.format(Number(item.gross))}</td><td className="p-3">{money.format(Number(item.platform_fee))}</td><td className="p-3 font-medium">{money.format(Number(item.net))}</td><td className="p-3">{item.status === "paid" ? "Đã chi" : "Chờ chi"}</td></tr>)}</tbody></table></div>}
    </main>
  );
}
